'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { logAudit } from '@/lib/actions/audit-actions'
import { sendSms } from '@/lib/actions/sms-actions'
import {
  verifyReconciliationAccess,
  verifyTreasurerAuthority,
} from '@/lib/auth/guards'
import type { AllocationInput } from '@/lib/actions/reconciliation-actions'
import { computeExpectedPeriods, calculateAllocations } from '@/lib/utils/allocation'

const FOUR_EYES_THRESHOLD = 20000

const manualEntrySchema = z.object({
  church_id: z.string().min(1, 'Church is required'),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  payment_method: z.enum(['Cash', 'Cheque', 'Bank_Transfer']),
  transaction_id: z.string().min(1, 'Reference is required'),
  payment_date: z.string(),
  notes: z.string().optional(),
  attachment_url: z.string().optional(),
})

export type PendingApprovalRow = {
  id: string
  type: 'payment' | 'writeoff'
  church_code: string
  church_name: string
  amount: number
  proposed_by: string
  proposed_at: string
  days_old: number
  payload: Record<string, unknown>
}

export async function createManualEntry(formData: FormData) {
  try {
    const { actorId, actorEmail } = await verifyReconciliationAccess()

    const allocationsRaw = formData.get('allocations') as string | null
    let allocations: AllocationInput[] = []
    if (allocationsRaw) {
      try {
        allocations = JSON.parse(allocationsRaw) as AllocationInput[]
      } catch {
        return { error: 'Invalid allocations format' }
      }
    }

    const raw = {
      church_id: formData.get('church_id'),
      amount: formData.get('amount'),
      payment_method: formData.get('payment_method'),
      transaction_id: formData.get('transaction_id'),
      payment_date: formData.get('payment_date'),
      notes: formData.get('notes') || undefined,
      attachment_url: formData.get('attachment_url') || undefined,
    }

    const validated = manualEntrySchema.safeParse(raw)
    if (!validated.success) {
      return { error: validated.error.issues[0].message }
    }

    const data = validated.data

    if (allocations.length === 0) {
      return { error: 'At least one allocation is required' }
    }

    const church = await prisma.church.findUnique({
      where: { id: data.church_id },
    })
    if (!church) return { error: 'Church not found' }
    if (church.is_defunct) {
      return { error: 'Cannot create payments for a defunct church' }
    }

    // Idempotency — no duplicate references
    const existing = await prisma.payment.findUnique({
      where: { transaction_id: data.transaction_id },
    })
    if (existing) return { error: 'A payment with this reference already exists' }

    const needsApproval = data.amount >= FOUR_EYES_THRESHOLD
    const paymentDate = new Date(data.payment_date)

    // ===== ROUTE A: Four-Eyes Required =====
    if (needsApproval) {
      const pending = await prisma.pendingPayment.create({
        data: {
          proposed_by: actorId,
          church_id: data.church_id,
          amount: data.amount,
          payment_method: data.payment_method,
          transaction_id: data.transaction_id,
          payment_date: paymentDate,
          allocations_json: allocations,
          attachment_url: data.attachment_url ?? null,
          notes: data.notes ?? null,
          status: 'Pending',
        },
      })

      await logAudit({
        action: 'MANUAL_ENTRY_SUBMITTED_FOR_APPROVAL',
        entity: 'PendingPayment',
        entityId: pending.id,
        beforeData: null,
        afterData: {
          church_code: church.church_code,
          amount: data.amount,
          method: data.payment_method,
          transaction_id: data.transaction_id,
          allocations,
        },
        metadata: { reason: 'amount_threshold', actor_email: actorEmail },
      })

      revalidatePath('/dashboard/reconciliation/manual-entry')
      revalidatePath('/dashboard/reconciliation/pending-approvals')
      return {
        success: true,
        requiresApproval: true,
        pendingPaymentId: pending.id,
      }
    }

    // ===== ROUTE B: Direct Creation =====
    const newPayment = await prisma.$transaction(
      async (tx) => {
        const payment = await tx.payment.create({
          data: {
            church_id: data.church_id,
            transaction_id: data.transaction_id,
            payment_type: allocations[0].allocation_type,
            amount_paid: data.amount,
            payment_date: paymentDate,
            payment_method: data.payment_method,
            status: 'Paid',
            source: 'Manual',
            month_covered: paymentDate.toLocaleString('default', {
              month: 'long',
              year: 'numeric',
            }),
            billing_year: allocations[0].billing_year,
          },
        })

        await tx.paymentAllocation.createMany({
          data: allocations.map((a) => ({
            payment_id: payment.id,
            allocation_type: a.allocation_type,
            billing_year: a.billing_year,
            billing_month: a.billing_month,
            amount: a.amount,
          })),
        })

        return payment
      },
      { timeout: 15000 }
    )

    await logAudit({
      action: 'MANUAL_PAYMENT_CREATED',
      entity: 'Payment',
      entityId: newPayment.id,
      beforeData: null,
      afterData: {
        church_code: church.church_code,
        amount: data.amount,
        method: data.payment_method,
        transaction_id: data.transaction_id,
        allocations,
      },
    })

    if (church.contact_phone) {
      const smsMsg = `Payment of KES ${data.amount.toLocaleString()} for ${church.church_name} (${church.church_code}) received. Ref: ${data.transaction_id}. Thank you. - Maranatha`
      await sendSms(church.contact_phone, smsMsg, 'Receipt')
    }

    revalidatePath('/dashboard/reconciliation/manual-entry')
    revalidatePath('/dashboard/payments')
    return { success: true, requiresApproval: false, paymentId: newPayment.id }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create manual entry'
    return { error: message }
  }
}

export async function getPendingApprovals(): Promise<PendingApprovalRow[]> {
  try {
    await verifyTreasurerAuthority()

    const [payments, writeoffs] = await Promise.all([
      prisma.pendingPayment.findMany({
        where: { status: 'Pending' },
        include: { church: { select: { church_code: true, church_name: true } } },
        orderBy: { proposed_at: 'asc' },
      }),
      prisma.writeOff.findMany({
        where: { status: 'Pending' },
        include: { church: { select: { church_code: true, church_name: true } } },
        orderBy: { proposed_at: 'asc' },
      }),
    ])

    const now = new Date()
    const dayDiff = (d: Date) =>
      Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))

    const paymentRows: PendingApprovalRow[] = payments.map((p) => ({
      id: p.id,
      type: 'payment' as const,
      church_code: p.church.church_code,
      church_name: p.church.church_name,
      amount: Number(p.amount),
      proposed_by: p.proposed_by,
      proposed_at: p.proposed_at.toISOString(),
      days_old: dayDiff(p.proposed_at),
      payload: {
        payment_method: p.payment_method,
        transaction_id: p.transaction_id,
        notes: p.notes,
        allocations: p.allocations_json,
      },
    }))

    const writeoffRows: PendingApprovalRow[] = writeoffs.map((w) => ({
      id: w.id,
      type: 'writeoff' as const,
      church_code: w.church.church_code,
      church_name: w.church.church_name,
      amount: Number(w.amount),
      proposed_by: w.proposed_by,
      proposed_at: w.proposed_at.toISOString(),
      days_old: dayDiff(w.proposed_at),
      payload: {
        reason: w.reason,
        notes: w.notes,
      },
    }))

    return [...paymentRows, ...writeoffRows].sort(
      (a, b) => b.days_old - a.days_old
    )
  } catch (error) {
    console.error('Failed to fetch pending approvals:', error)
    return []
  }
}

export async function approvePendingPayment(pendingId: string) {
  try {
    const { actorId, actorEmail } = await verifyTreasurerAuthority()

    const pending = await prisma.pendingPayment.findUnique({
      where: { id: pendingId },
      include: { church: true },
    })
    if (!pending) return { error: 'Pending payment not found' }
    if (pending.status !== 'Pending') return { error: 'Already processed' }

    const allocations = pending.allocations_json as unknown as AllocationInput[]
    if (!Array.isArray(allocations) || allocations.length === 0) {
      return { error: 'Invalid allocations snapshot' }
    }

    const newPayment = await prisma.$transaction(
      async (tx) => {
        const payment = await tx.payment.create({
          data: {
            church_id: pending.church_id,
            transaction_id: pending.transaction_id,
            payment_type: allocations[0].allocation_type,
            amount_paid: pending.amount,
            payment_date: pending.payment_date,
            payment_method: pending.payment_method as 'Cash' | 'Cheque' | 'Bank_Transfer',
            status: 'Paid',
            source: 'Manual',
            month_covered: pending.payment_date.toLocaleString('default', {
              month: 'long',
              year: 'numeric',
            }),
            billing_year: allocations[0].billing_year,
          },
        })

        await tx.paymentAllocation.createMany({
          data: allocations.map((a) => ({
            payment_id: payment.id,
            allocation_type: a.allocation_type,
            billing_year: a.billing_year,
            billing_month: a.billing_month,
            amount: a.amount,
          })),
        })

        await tx.pendingPayment.update({
          where: { id: pendingId },
          data: {
            status: 'Approved',
            reviewed_by: actorId,
            reviewed_at: new Date(),
            resulting_payment_id: payment.id,
          },
        })

        return payment
      },
      { timeout: 15000 }
    )

    await logAudit({
      action: 'PENDING_PAYMENT_APPROVED',
      entity: 'PendingPayment',
      entityId: pendingId,
      beforeData: { status: 'Pending', amount: Number(pending.amount) },
      afterData: {
        status: 'Approved',
        payment_id: newPayment.id,
        church_code: pending.church.church_code,
        approved_by_email: actorEmail,
      },
    })

    if (pending.church.contact_phone) {
      const smsMsg = `Payment of KES ${Number(pending.amount).toLocaleString()} for ${pending.church.church_name} (${pending.church.church_code}) received. Ref: ${pending.transaction_id}. Thank you. - Maranatha`
      await sendSms(pending.church.contact_phone, smsMsg, 'Receipt')
    }

    revalidatePath('/dashboard/reconciliation/pending-approvals')
    revalidatePath('/dashboard/reconciliation/manual-entry')
    revalidatePath('/dashboard/payments')
    return { success: true, paymentId: newPayment.id }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to approve'
    return { error: message }
  }
}

export async function rejectPendingPayment(pendingId: string, reason: string) {
  try {
    const { actorId } = await verifyTreasurerAuthority()

    const pending = await prisma.pendingPayment.findUnique({
      where: { id: pendingId },
      include: { church: true },
    })
    if (!pending) return { error: 'Not found' }
    if (pending.status !== 'Pending') return { error: 'Already processed' }

    await prisma.pendingPayment.update({
      where: { id: pendingId },
      data: {
        status: 'Rejected',
        reviewed_by: actorId,
        reviewed_at: new Date(),
        rejection_reason: reason,
      },
    })

    await logAudit({
      action: 'PENDING_PAYMENT_REJECTED',
      entity: 'PendingPayment',
      entityId: pendingId,
      beforeData: { status: 'Pending' },
      afterData: { status: 'Rejected', reason, church_code: pending.church.church_code },
    })

    revalidatePath('/dashboard/reconciliation/pending-approvals')
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reject'
    return { error: message }
  }
}

export async function getManualEntryAllocations(
  churchId: string,
  amount: number
): Promise<{ allocations?: AllocationInput[]; error?: string }> {
  try {
    await verifyReconciliationAccess()

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
      amount,
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