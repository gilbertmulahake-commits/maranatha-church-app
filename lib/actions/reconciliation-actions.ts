'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/actions/audit-actions'
import { sendSms } from '@/lib/actions/sms-actions'
import { recordResolution } from '@/lib/utils/matching'
import { verifyReconciliationAccess } from '@/lib/auth/guards'
import { getExpectedUpToDate } from '@/lib/utils/financial'
import { computeExpectedPeriods, calculateAllocations } from '@/lib/utils/allocation'
import { 
  FOUR_EYES_THRESHOLD, 
  PRISMA_TRANSACTION_TIMEOUT, 
  ARREARS_CRITICAL_DAYS,
  SLA_YELLOW_DAYS,
  SLA_RED_DAYS
} from '@/lib/constants'

export type UnmatchedQueueRow = {
  id: string
  bank_reference: string
  bank_name: string
  raw_bill_ref: string
  amount: number
  payer_phone: string | null
  status: string
  suggested_church_id: string | null
  suggested_church_code: string | null
  suggested_church_name: string | null
  confidence_score: number | null
  age_days: number
  sla_status: 'green' | 'yellow' | 'red'
  created_at: string
}

export type AllocationInput = {
  allocation_type: 'Annual' | 'Monthly'
  billing_year: number
  billing_month: number | null
  amount: number
}

export async function getUnmatchedQueue(): Promise<UnmatchedQueueRow[]> {
  try {
    await verifyReconciliationAccess()

    const items = await prisma.unmatchedPayment.findMany({
      where: { status: 'Pending', assigned_church_id: null },
      include: {
        suggested_church: { select: { church_code: true, church_name: true } },
      },
      orderBy: { created_at: 'asc' },
    })

    const now = new Date()

    return items.map((item) => {
      const ageDays = Math.floor(
        (now.getTime() - item.created_at.getTime()) / (1000 * 60 * 60 * 24)
      )
      
      let slaStatus: 'green' | 'yellow' | 'red' = 'green'
      if (ageDays >= SLA_RED_DAYS) slaStatus = 'red'
      else if (ageDays >= SLA_YELLOW_DAYS) slaStatus = 'yellow'

      return {
        id: item.id,
        bank_reference: item.bank_reference,
        bank_name: item.bank_name,
        raw_bill_ref: item.raw_bill_ref,
        amount: Number(item.amount),
        payer_phone: item.payer_phone,
        status: item.status,
        suggested_church_id: item.suggested_church_id,
        suggested_church_code: item.suggested_church?.church_code ?? null,
        suggested_church_name: item.suggested_church?.church_name ?? null,
        confidence_score: item.confidence_score,
        age_days: ageDays,
        sla_status: slaStatus,
        created_at: item.created_at.toISOString(),
      }
    })
  } catch (error) {
    console.error('Failed to fetch unmatched queue:', error)
    return []
  }
}

async function compute90PlusArrears(churchId: string): Promise<number> {
  const criticalDate = new Date()
  criticalDate.setDate(criticalDate.getDate() - ARREARS_CRITICAL_DAYS)

  const church = await prisma.church.findUnique({
    where: { id: churchId },
    include: {
      payments: { where: { status: 'Paid' }, include: { allocations: true } },
    },
  })
  if (!church) return 0

  let paidBeforeCritical = 0
  church.payments.forEach((p) => {
    if (new Date(p.payment_date) <= criticalDate) {
      const amount =
        p.allocations.length === 0
          ? Number(p.amount_paid)
          : p.allocations.reduce((s, a) => s + Number(a.amount), 0)
      paidBeforeCritical += amount
    }
  })

  const { totalExpected: expectedCritical } = getExpectedUpToDate(
    church.created_at,
    criticalDate
  )
  return Math.max(0, expectedCritical - paidBeforeCritical)
}

async function requiresTreasurerApproval(
  churchId: string,
  amount: number
): Promise<boolean> {
  if (amount >= FOUR_EYES_THRESHOLD) return true
  const arrearsCritical = await compute90PlusArrears(churchId)
  return arrearsCritical > 0
}

export async function resolveUnmatched(params: {
  unmatchedId: string
  churchId: string
  allocations: AllocationInput[]
}) {
  try {
    const { actorId, actorEmail } = await verifyReconciliationAccess()

    const unmatched = await prisma.unmatchedPayment.findUnique({
      where: { id: params.unmatchedId },
    })
    if (!unmatched) return { error: 'Unmatched payment not found' }
    
    if (unmatched.status !== 'Pending' || unmatched.assigned_church_id !== null) {
      return { error: 'Already processed or pending approval' }
    }

    const church = await prisma.church.findUnique({
      where: { id: params.churchId },
    })
    if (!church) return { error: 'Church not found' }

    const amount = Number(unmatched.amount)
    const needsApproval = await requiresTreasurerApproval(params.churchId, amount)

    // ===== ROUTE A: Four-Eyes Required =====
    if (needsApproval) {
      const pending = await prisma.pendingPayment.create({
        data: {
          proposed_by: actorId,
          church_id: params.churchId,
          amount: amount,
          payment_method: 'Bank_Transfer',
          transaction_id: unmatched.bank_reference,
          payment_date: unmatched.created_at,
          allocations_json: params.allocations,
          notes: `Resolved from unmatched ${unmatched.bank_reference}`,
          status: 'Pending',
        },
      })

      await prisma.unmatchedPayment.update({
        where: { id: params.unmatchedId },
        data: {
          reviewed_by: actorEmail,
          reviewed_at: new Date(),
          notes: `Submitted for Treasurer approval (pending payment ${pending.id})`,
          assigned_church_id: params.churchId,
        },
      })

      await logAudit({
        action: 'UNMATCHED_SUBMITTED_FOR_APPROVAL',
        entity: 'UnmatchedPayment',
        entityId: params.unmatchedId,
        beforeData: { status: 'Pending' },
        afterData: {
          status: 'Pending (awaiting treasurer)',
          pending_payment_id: pending.id,
        },
        metadata: {
          amount,
          church_code: church.church_code,
          reason:
            amount >= FOUR_EYES_THRESHOLD ? 'amount_threshold' : 'critical_arrears',
        },
      })

      revalidatePath('/dashboard/reconciliation')
      revalidatePath('/dashboard/reconciliation/unmatched')
      return { success: true, requiresApproval: true, pendingPaymentId: pending.id }
    }

    // ===== ROUTE B: Direct Resolution =====
    const newPayment = await prisma.$transaction(
      async (tx) => {
        const payment = await tx.payment.create({
          data: {
            church_id: params.churchId,
            transaction_id: unmatched.bank_reference,
            payment_type: params.allocations[0]?.allocation_type ?? 'Annual',
            amount_paid: amount,
            payment_date: unmatched.created_at,
            payment_method: 'Bank_Transfer',
            status: 'Paid',
            source: 'Resolved',
            month_covered: unmatched.created_at.toLocaleString('default', {
              month: 'long',
              year: 'numeric',
            }),
            billing_year:
              params.allocations[0]?.billing_year ?? new Date().getFullYear(),
          },
        })

        if (params.allocations.length > 0) {
          await tx.paymentAllocation.createMany({
            data: params.allocations.map((a) => ({
              payment_id: payment.id,
              allocation_type: a.allocation_type,
              billing_year: a.billing_year,
              billing_month: a.billing_month,
              amount: a.amount,
            })),
          })
        }

        await tx.unmatchedPayment.update({
          where: { id: params.unmatchedId },
          data: {
            status: 'Resolved',
            assigned_church_id: params.churchId,
            assigned_payment_id: payment.id,
            reviewed_by: actorEmail,
            reviewed_at: new Date(),
          },
        })

        return payment
      },
      { timeout: PRISMA_TRANSACTION_TIMEOUT }
    )

    await recordResolution({
      rawReference: unmatched.raw_bill_ref,
      resolvedChurchCode: church.church_code,
      resolutionType: 'Manual',
      actorId,
    })

    await logAudit({
      action: 'UNMATCHED_RESOLVED',
      entity: 'UnmatchedPayment',
      entityId: params.unmatchedId,
      beforeData: { status: 'Pending', raw_bill_ref: unmatched.raw_bill_ref },
      afterData: {
        status: 'Resolved',
        payment_id: newPayment.id,
        church_code: church.church_code,
        allocations: params.allocations,
      },
    })

    if (unmatched.payer_phone) {
      const smsMsg = `Payment of KES ${amount.toLocaleString()} for ${church.church_name} (${church.church_code}) received. Ref: ${unmatched.bank_reference}. Thank you. - Maranatha`
      await sendSms(unmatched.payer_phone, smsMsg, 'Receipt')
    }

    revalidatePath('/dashboard/reconciliation')
    revalidatePath('/dashboard/reconciliation/unmatched')
    return { success: true, requiresApproval: false, paymentId: newPayment.id }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to resolve unmatched payment'
    return { error: message }
  }
}

export async function rejectUnmatched(unmatchedId: string, reason: string) {
  try {
    const { actorEmail } = await verifyReconciliationAccess()

    const unmatched = await prisma.unmatchedPayment.findUnique({
      where: { id: unmatchedId },
    })
    if (!unmatched) return { error: 'Not found' }
    if (unmatched.status !== 'Pending') return { error: 'Already processed' }

    await prisma.unmatchedPayment.update({
      where: { id: unmatchedId },
      data: {
        status: 'Rejected',
        reviewed_by: actorEmail,
        reviewed_at: new Date(),
        notes: reason,
      },
    })

    await logAudit({
      action: 'UNMATCHED_REJECTED',
      entity: 'UnmatchedPayment',
      entityId: unmatchedId,
      beforeData: { status: 'Pending' },
      afterData: { status: 'Rejected', reason },
    })

    revalidatePath('/dashboard/reconciliation')
    revalidatePath('/dashboard/reconciliation/unmatched')
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reject'
    return { error: message }
  }
}

export async function escalateUnmatched(unmatchedId: string) {
  try {
    const { actorEmail } = await verifyReconciliationAccess()

    await prisma.unmatchedPayment.update({
      where: { id: unmatchedId },
      data: { escalated_at: new Date(), reviewed_by: actorEmail },
    })

    await logAudit({
      action: 'UNMATCHED_ESCALATED',
      entity: 'UnmatchedPayment',
      entityId: unmatchedId,
      beforeData: null,
      afterData: { escalated_at: new Date().toISOString() },
    })

    revalidatePath('/dashboard/reconciliation')
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to escalate'
    return { error: message }
  }
}

export async function getUnresolvedCounts() {
  try {
    const [unmatchedCount, pendingCount, writeOffCount] = await Promise.all([
      prisma.unmatchedPayment.count({ where: { status: 'Pending', assigned_church_id: null } }),
      prisma.pendingPayment.count({ where: { status: 'Pending' } }),
      prisma.writeOff.count({ where: { status: 'Pending' } }),
    ])
    return {
      unmatched: unmatchedCount,
      pendingPayments: pendingCount,
      pendingWriteOffs: writeOffCount,
      total: unmatchedCount + pendingCount + writeOffCount,
    }
  } catch {
    return { unmatched: 0, pendingPayments: 0, pendingWriteOffs: 0, total: 0 }
  }
}

export async function getReconciliationHubStats() {
  try {
    await verifyReconciliationAccess()

    const now = new Date()
    const yellowDaysAgo = new Date(now.getTime() - SLA_YELLOW_DAYS * 24 * 60 * 60 * 1000)
    const redDaysAgo = new Date(now.getTime() - SLA_RED_DAYS * 24 * 60 * 60 * 1000)

    const [unmatchedTotal, pendingPayments, pendingWriteOffs, green, yellow, red] =
      await Promise.all([
        prisma.unmatchedPayment.count({ where: { status: 'Pending', assigned_church_id: null } }),
        prisma.pendingPayment.count({ where: { status: 'Pending' } }),
        prisma.writeOff.count({ where: { status: 'Pending' } }),
        prisma.unmatchedPayment.count({
          where: { status: 'Pending', assigned_church_id: null, created_at: { gt: yellowDaysAgo } },
        }),
        prisma.unmatchedPayment.count({
          where: {
            status: 'Pending',
            assigned_church_id: null,
            created_at: { lte: yellowDaysAgo, gt: redDaysAgo },
          },
        }),
        prisma.unmatchedPayment.count({
          where: { status: 'Pending', assigned_church_id: null, created_at: { lte: redDaysAgo } },
        }),
      ])

    return {
      unmatched: unmatchedTotal,
      pendingPayments,
      pendingWriteOffs,
      total: unmatchedTotal + pendingPayments + pendingWriteOffs,
      sla: { green, yellow, red },
    }
  } catch (error) {
    console.error('Failed to fetch reconciliation hub stats:', error)
    return {
      unmatched: 0,
      pendingPayments: 0,
      pendingWriteOffs: 0,
      total: 0,
      sla: { green: 0, yellow: 0, red: 0 },
    }
  }
}

export async function getSuggestedAllocations(
  unmatchedId: string,
  churchId: string
): Promise<{ allocations?: AllocationInput[]; error?: string }> {
  try {
    await verifyReconciliationAccess()

    const unmatched = await prisma.unmatchedPayment.findUnique({
      where: { id: unmatchedId },
    })
    if (!unmatched) return { error: 'Unmatched payment not found' }

    const church = await prisma.church.findUnique({
      where: { id: churchId },
      include: {
        payments: { include: { allocations: true } },
      },
    })
    if (!church) return { error: 'Church not found' }

    const transDate = new Date()

    const existingAllocations = church.payments.flatMap((p) =>
      p.allocations.map((a) => ({
        allocation_type: a.allocation_type,
        billing_year: a.billing_year,
        billing_month: a.billing_month,
        amount: Number(a.amount),
      }))
    )

    const { expectedAnnuals, expectedMonthlies } = computeExpectedPeriods(
      church.created_at,
      existingAllocations,
      transDate
    )

    const computed = calculateAllocations(
      Number(unmatched.amount),
      expectedAnnuals,
      expectedMonthlies,
      transDate
    )

    return {
      allocations: computed.map((a) => ({
        allocation_type: a.allocation_type,
        billing_year: a.billing_year,
        billing_month: a.billing_month,
        amount: a.amount,
      })),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to compute preview'
    return { error: message }
  }
}