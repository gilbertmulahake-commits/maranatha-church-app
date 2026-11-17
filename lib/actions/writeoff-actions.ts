'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { logAudit } from '@/lib/actions/audit-actions'
import {
  verifyReconciliationAccess,
  verifyTreasurerAuthority,
} from '@/lib/auth/guards'
import { getExpectedUpToDate } from '@/lib/utils/financial'

const writeOffSchema = z.object({
  church_id: z.string().min(1, 'Church is required'),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  reason: z.enum([
    'DEFUNCT',
    'DISSOLVED',
    'UNCOLLECTABLE_90D',
    'COURT_ORDER',
    'OTHER',
  ]),
  notes: z.string().min(10, 'Please provide at least 10 characters of justification'),
})

export type WriteOffRow = {
  id: string
  church_code: string
  church_name: string
  amount: number
  reason: string
  notes: string | null
  status: string
  proposed_by: string
  proposed_at: string
  approved_by: string | null
  approved_at: string | null
  rejection_reason: string | null
  days_old: number
}

async function computeChurchOutstanding(churchId: string): Promise<{ total: number; annual: number; monthly: number }> {
  const church = await prisma.church.findUnique({
    where: { id: churchId },
    include: {
      payments: { where: { status: 'Paid' }, include: { allocations: true } },
      write_offs: { where: { status: 'Approved' } },
    },
  })
  if (!church) return { total: 0, annual: 0, monthly: 0 }

  let annualPaid = 0
  let monthlyPaid = 0
  church.payments.forEach((p) => {
    if (p.allocations.length === 0) {
      const amt = Number(p.amount_paid)
      if (p.payment_type === 'Annual') annualPaid += amt
      else monthlyPaid += amt
    } else {
      p.allocations.forEach((a) => {
        const amt = Number(a.amount)
        if (a.allocation_type === 'Annual') annualPaid += amt
        else monthlyPaid += amt
      })
    }
  })

  const { expectedAnnual, expectedMonthly } = getExpectedUpToDate(
    church.created_at,
    new Date()
  )
  
  const annualOutstanding = Math.max(0, expectedAnnual - annualPaid)
  const monthlyOutstanding = Math.max(0, expectedMonthly - monthlyPaid)
  const grossOutstanding = annualOutstanding + monthlyOutstanding

  const alreadyWritten = church.write_offs.reduce(
    (s, w) => s + Number(w.amount),
    0
  )

  return {
    total: Math.max(0, grossOutstanding - alreadyWritten),
    annual: annualOutstanding,
    monthly: monthlyOutstanding,
  }
}

export async function getWriteOffs(): Promise<WriteOffRow[]> {
  try {
    await verifyReconciliationAccess()

    const writeoffs = await prisma.writeOff.findMany({
      include: { church: { select: { church_code: true, church_name: true } } },
      orderBy: { proposed_at: 'desc' },
    })

    const now = new Date()
    return writeoffs.map((w) => ({
      id: w.id,
      church_code: w.church.church_code,
      church_name: w.church.church_name,
      amount: Number(w.amount),
      reason: w.reason,
      notes: w.notes,
      status: w.status,
      proposed_by: w.proposed_by,
      proposed_at: w.proposed_at.toISOString(),
      approved_by: w.approved_by,
      approved_at: w.approved_at?.toISOString() ?? null,
      rejection_reason: w.rejection_reason,
      days_old: Math.floor(
        (now.getTime() - w.proposed_at.getTime()) / (1000 * 60 * 60 * 24)
      ),
    }))
  } catch (error) {
    console.error('Failed to fetch write-offs:', error)
    return []
  }
}

export async function getChurchOutstandingForWriteOff(churchId: string) {
  try {
    await verifyReconciliationAccess()
    const outstanding = await computeChurchOutstanding(churchId)
    return { outstanding }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to compute'
    return { error: message }
  }
}

export async function proposeWriteOff(formData: FormData) {
  try {
    const { actorId, actorEmail } = await verifyReconciliationAccess()

    const raw = {
      church_id: formData.get('church_id'),
      amount: formData.get('amount'),
      reason: formData.get('reason'),
      notes: formData.get('notes'),
    }

    const validated = writeOffSchema.safeParse(raw)
    if (!validated.success) {
      return { error: validated.error.issues[0].message }
    }
    const data = validated.data

    const church = await prisma.church.findUnique({
      where: { id: data.church_id },
    })
    if (!church) return { error: 'Church not found' }
    if (church.is_defunct) return { error: 'Church is already marked defunct' }

    const outstanding = await computeChurchOutstanding(data.church_id)
    
    if (outstanding.total === 0) {
      return { error: 'This church has no outstanding balance to write off' }
    }
    if (data.amount > outstanding.total) {
      return {
        error: `Amount exceeds outstanding balance (KES ${outstanding.total.toLocaleString()})`,
      }
    }

    const writeOff = await prisma.writeOff.create({
      data: {
        church_id: data.church_id,
        amount: data.amount,
        reason: data.reason,
        notes: data.notes,
        status: 'Pending',
        proposed_by: actorId,
      },
    })

    await logAudit({
      action: 'WRITEOFF_PROPOSED',
      entity: 'WriteOff',
      entityId: writeOff.id,
      beforeData: null,
      afterData: {
        church_code: church.church_code,
        church_name: church.church_name,
        amount: data.amount,
        reason: data.reason,
        notes: data.notes,
        outstanding_before: outstanding.total,
      },
      metadata: { actor_email: actorEmail },
    })

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/churches')
    revalidatePath('/dashboard/reconciliation')
    revalidatePath('/dashboard/reconciliation/write-offs')
    revalidatePath('/dashboard/reconciliation/pending-approvals')
    return { success: true, writeOffId: writeOff.id }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to propose write-off'
    return { error: message }
  }
}

export async function approveWriteOff(writeOffId: string) {
  try {
    const { actorId, actorEmail } = await verifyTreasurerAuthority()

    const writeOff = await prisma.writeOff.findUnique({
      where: { id: writeOffId },
      include: { church: true },
    })
    if (!writeOff) return { error: 'Write-off not found' }
    if (writeOff.status !== 'Pending') return { error: 'Already processed' }

    // 🚨 FIXED: Separation of Duties (Four-Eyes Rule)
    if (writeOff.proposed_by === actorId) {
      return { error: 'You cannot approve a write-off you proposed yourself. A different Treasurer must approve this.' }
    }

    // Re-verify outstanding hasn't changed (payments may have arrived while pending)
    const outstanding = await computeChurchOutstanding(writeOff.church_id)
    const writeOffAmount = Number(writeOff.amount)
    
    if (writeOffAmount > outstanding.total + 0.01) {
      return {
        error: `Cannot approve: current outstanding is KES ${outstanding.total.toLocaleString()}, but write-off is KES ${writeOffAmount.toLocaleString()}. Reject and re-propose.`,
      }
    }

    // Determine if this covers the FULL outstanding (triggers is_defunct)
    const resultingDefunctFlag = outstanding.total - writeOffAmount < 1

    await prisma.$transaction(async (tx) => {
      // 🚨 FIX: Claim the write-off atomically to prevent double-clicks
      const claimed = await tx.writeOff.updateMany({
        where: { id: writeOffId, status: 'Pending' },
        data: {
          status: 'Approved',
          approved_by: actorId,
          approved_at: new Date(),
          resulting_defunct_flag: resultingDefunctFlag,
        },
      })

      if (claimed.count === 0) {
        throw new Error('This write-off has already been processed.')
      }

      if (resultingDefunctFlag) {
        await tx.church.update({
          where: { id: writeOff.church_id },
          data: { is_defunct: true },
        })
      }
    })

    await logAudit({
      action: 'WRITEOFF_APPROVED',
      entity: 'WriteOff',
      entityId: writeOffId,
      beforeData: { status: 'Pending' },
      afterData: {
        status: 'Approved',
        church_code: writeOff.church.church_code,
        amount: writeOffAmount,
        reason: writeOff.reason,
        marked_defunct: resultingDefunctFlag,
        outstanding_after: outstanding.total - writeOffAmount,
        approved_by_email: actorEmail,
      },
    })

    // 🚨 FIX: Revalidate ALL affected paths
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/churches')
    revalidatePath('/dashboard/reconciliation')
    revalidatePath('/dashboard/reconciliation/write-offs')
    revalidatePath('/dashboard/reconciliation/pending-approvals')
    
    return { success: true, markedDefunct: resultingDefunctFlag }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to approve'
    return { error: message }
  }
}

export async function rejectWriteOff(writeOffId: string, reason: string) {
  try {
    const { actorId, actorEmail } = await verifyTreasurerAuthority()

    const writeOff = await prisma.writeOff.findUnique({
      where: { id: writeOffId },
      include: { church: true },
    })
    if (!writeOff) return { error: 'Not found' }
    if (writeOff.status !== 'Pending') return { error: 'Already processed' }

    // 🚨 FIXED: Separation of Duties (Four-Eyes Rule)
    if (writeOff.proposed_by === actorId) {
      return { error: 'You cannot reject a write-off you proposed yourself. A different Treasurer must review it.' }
    }

    const claimed = await prisma.writeOff.updateMany({
      where: { id: writeOffId, status: 'Pending' },
      data: {
        status: 'Rejected',
        approved_by: actorId,
        approved_at: new Date(),
        rejection_reason: reason,
      },
    })

    if (claimed.count === 0) {
      return { error: 'This write-off has already been processed.' }
    }

    await logAudit({
      action: 'WRITEOFF_REJECTED',
      entity: 'WriteOff',
      entityId: writeOffId,
      beforeData: { status: 'Pending' },
      afterData: {
        status: 'Rejected',
        reason,
        church_code: writeOff.church.church_code,
        rejected_by_email: actorEmail,
      },
    })

    revalidatePath('/dashboard/reconciliation/write-offs')
    revalidatePath('/dashboard/reconciliation/pending-approvals')
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reject'
    return { error: message }
  }
}