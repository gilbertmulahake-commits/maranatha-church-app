'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { logAudit } from '@/lib/actions/audit-actions'
import {
  verifyOperationsAccess,
  verifyReportsAccess,
  verifyChurchDeletionRequestAccess,
} from '@/lib/auth/guards'
import { softDeleteChurchTx } from '@/lib/church/soft-delete-tx'
import {
  PRISMA_TRANSACTION_TIMEOUT,
  CHURCH_DELETION_SLA_YELLOW_DAYS,
  CHURCH_DELETION_SLA_RED_DAYS,
} from '@/lib/constants'

const proposeSchema = z
  .object({
    reason: z.enum(['DISSOLVED', 'MERGED', 'DUPLICATE', 'OTHER']),
    notes: z.string().max(500, 'Notes must be 500 characters or fewer').nullish(),
  })
  .refine(
    (d) => d.reason !== 'OTHER' || (!!d.notes && d.notes.trim().length >= 100),
    {
      message: 'Non-standard deletions require at least 100 characters of justification.',
      path: ['notes'],
    }
  )

/**
 * Shared row shape for both the National approval queue and the Regional
 * "My Deletion Requests" panel. `proposed_by` / `reviewed_by` are user IDs
 * (String, no Prisma relation on ChurchDeletionRequest); the *_email fields
 * are joined manually in the read actions to avoid N+1 on the list render.
 */
export type ChurchDeletionRequestRow = {
  id: string
  church_id: string
  church_code: string
  church_name: string
  region_name: string
  reason: string
  reason_category: 'standard' | 'non_standard'
  notes: string | null
  status: string
  proposed_by: string
  proposed_by_email: string
  proposed_at: string
  reviewed_by: string | null
  reviewed_by_email: string | null
  reviewed_at: string | null
  rejection_reason: string | null
  resulted_in_deletion: boolean
  days_old: number
  sla_status: 'green' | 'yellow' | 'red'
}

/**
 * Deletion-specific SLA. Uses CHURCH_DELETION_SLA_* (3/7) — NOT the
 * reconciliation SLA (7/30). Rationale documented in `architecture.md` § 8
 * "Church deletion approval — SLA thresholds".
 */
function computeSlaStatus(ageDays: number): 'green' | 'yellow' | 'red' {
  if (ageDays <= CHURCH_DELETION_SLA_YELLOW_DAYS) return 'green'
  if (ageDays <= CHURCH_DELETION_SLA_RED_DAYS) return 'yellow'
  return 'red'
}

function daysBetween(from: Date, now: Date = new Date()): number {
  return Math.floor((now.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
}

function reasonCategory(reason: string): 'standard' | 'non_standard' {
  return reason === 'OTHER' ? 'non_standard' : 'standard'
}

// ----------------------------------------------------------------------------
// Mutations
// ----------------------------------------------------------------------------

export async function proposeChurchDeletion(
  churchId: string,
  formData: FormData
): Promise<{ success: true; requestId: string } | { error: string }> {
  try {
    const { actorId, actorEmail, church } = await verifyChurchDeletionRequestAccess(churchId)

    const raw = {
      reason: formData.get('reason'),
      notes: formData.get('notes'),
    }

    const validated = proposeSchema.safeParse(raw)
    if (!validated.success) {
      return { error: validated.error.issues[0].message }
    }

    // Backstop duplicate — the UI disables the action, but a tampered request
    // must still be blocked server-side.
    const existing = await prisma.churchDeletionRequest.findFirst({
      where: { church_id: churchId, status: 'Pending' },
      select: { id: true },
    })
    if (existing) {
      return { error: 'A pending deletion request already exists for this church.' }
    }

    // Trim before storing — a `String?` field should hold null, not `''`.
    // The Zod refine has already enforced OTHER → ≥100 chars.
    const normalizedNotes = validated.data.notes?.trim() || null

    const created = await prisma.churchDeletionRequest.create({
      data: {
        church_id: churchId,
        reason: validated.data.reason,
        notes: normalizedNotes,
        status: 'Pending',
        proposed_by: actorId,
      },
    })

    await logAudit({
      action: 'CHURCH_DELETION_REQUESTED',
      entity: 'ChurchDeletionRequest',
      entityId: created.id,
      beforeData: null,
      afterData: {
        church_id: churchId,
        church_code: church.church_code,
        church_name: church.church_name,
        reason: validated.data.reason,
        reason_category: reasonCategory(validated.data.reason),
        notes: normalizedNotes,
      },
      metadata: { actor_email: actorEmail },
    })

    revalidatePath('/dashboard/regional')
    revalidatePath('/dashboard/church-deletion-requests')
    return { success: true as const, requestId: created.id }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to propose deletion request.'
    return { error: message }
  }
}

export async function cancelChurchDeletionRequest(
  requestId: string
): Promise<{ success: true } | { error: string }> {
  try {
    const { actorId, actorEmail } = await verifyReportsAccess()

    const request = await prisma.churchDeletionRequest.findUnique({
      where: { id: requestId },
      include: { church: { select: { church_code: true, church_name: true } } },
    })
    if (!request) return { error: 'Request not found.' }
    if (request.proposed_by !== actorId) {
      return { error: 'Forbidden: You can only cancel your own deletion requests.' }
    }
    if (request.status !== 'Pending') {
      return { error: 'Only pending requests can be cancelled.' }
    }

    await prisma.churchDeletionRequest.delete({ where: { id: requestId } })

    await logAudit({
      action: 'CHURCH_DELETION_CANCELLED',
      entity: 'ChurchDeletionRequest',
      entityId: requestId,
      beforeData: { status: 'Pending', reason: request.reason, notes: request.notes },
      afterData: { status: 'Cancelled' },
      metadata: { church_code: request.church.church_code, actor_email: actorEmail },
    })

    revalidatePath('/dashboard/regional')
    revalidatePath('/dashboard/church-deletion-requests')
    return { success: true as const }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to cancel deletion request.'
    return { error: message }
  }
}

export async function approveChurchDeletionRequest(
  id: string
): Promise<{ success: true } | { error: string }> {
  try {
    const { actorId, actorEmail } = await verifyOperationsAccess()

    const request = await prisma.churchDeletionRequest.findUnique({
      where: { id },
      include: {
        church: { select: { church_code: true, church_name: true, deleted_at: true } },
      },
    })
    if (!request) return { error: 'Deletion request not found.' }
    if (request.status !== 'Pending') return { error: 'Only pending requests can be approved.' }
    if (request.proposed_by === actorId) {
      return { error: 'You cannot approve a request you proposed.' }
    }
    if (request.church.deleted_at) return { error: 'Church is already deleted.' }

    // Blocking check — matches deleteChurch exactly. Do not orphan staging
    // records against a deleted church.
    const [pendingPayments, pendingWriteOffs, pendingUnmatched] = await Promise.all([
      prisma.pendingPayment.count({ where: { church_id: request.church_id, status: 'Pending' } }),
      prisma.writeOff.count({ where: { church_id: request.church_id, status: 'Pending' } }),
      prisma.unmatchedPayment.count({
        where: { assigned_church_id: request.church_id, status: 'Pending' },
      }),
    ])
    if (pendingPayments + pendingWriteOffs + pendingUnmatched > 0) {
      return {
        error:
          'This church has unresolved financial exceptions. Resolve them before deleting.',
      }
    }

    let deactivatedUserIds: string[] = []
    await prisma.$transaction(
      async (tx) => {
        const claimed = await tx.churchDeletionRequest.updateMany({
          where: { id, status: 'Pending' },
          data: {
            status: 'Approved',
            reviewed_by: actorId,
            reviewed_at: new Date(),
            resulted_in_deletion: true,
          },
        })
        if (claimed.count === 0) {
          throw new Error('This request has already been processed.')
        }
        const result = await softDeleteChurchTx(tx, request.church_id)
        deactivatedUserIds = result.deactivatedUserIds
      },
      { timeout: PRISMA_TRANSACTION_TIMEOUT }
    )

    // Two audit events — deletion and the request-approval are distinct
    // lifecycle events. Both fire AFTER the transaction commits (logAudit
    // must never run inside the transaction).
    await logAudit({
      action: 'CHURCH_DELETED',
      entity: 'Church',
      entityId: request.church_id,
      beforeData: {
        church_code: request.church.church_code,
        church_name: request.church.church_name,
        deleted_at: null,
      },
      afterData: {
        deleted_at: new Date().toISOString(),
        deactivated_user_ids: deactivatedUserIds,
      },
      metadata: {
        soft_delete: true,
        source: 'deletion_request',
        request_id: id,
        church_code: request.church.church_code,
      },
    })
    await logAudit({
      action: 'CHURCH_DELETION_APPROVED',
      entity: 'ChurchDeletionRequest',
      entityId: id,
      beforeData: { status: 'Pending' },
      afterData: { status: 'Approved', resulted_in_deletion: true },
      metadata: {
        request_id: id,
        church_code: request.church.church_code,
        approved_by_email: actorEmail,
      },
    })

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/churches')
    revalidatePath('/dashboard/churches/[code]', 'page')
    revalidatePath('/dashboard/church-deletion-requests')
    revalidatePath('/dashboard/regions')
    revalidatePath('/dashboard/regional')
    return { success: true as const }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to approve deletion request.'
    return { error: message }
  }
}

export async function rejectChurchDeletionRequest(
  id: string,
  reason: string
): Promise<{ success: true } | { error: string }> {
  try {
    const { actorId, actorEmail } = await verifyOperationsAccess()

    const trimmed = reason.trim()
    if (trimmed.length < 5) {
      return { error: 'Please provide a rejection reason of at least 5 characters.' }
    }

    const request = await prisma.churchDeletionRequest.findUnique({
      where: { id },
      include: { church: { select: { church_code: true, church_name: true } } },
    })
    if (!request) return { error: 'Deletion request not found.' }
    if (request.status !== 'Pending') return { error: 'Only pending requests can be rejected.' }
    if (request.proposed_by === actorId) {
      return { error: 'You cannot reject a request you proposed.' }
    }

    const claimed = await prisma.churchDeletionRequest.updateMany({
      where: { id, status: 'Pending' },
      data: {
        status: 'Rejected',
        reviewed_by: actorId,
        reviewed_at: new Date(),
        rejection_reason: trimmed,
      },
    })
    if (claimed.count === 0) {
      return { error: 'This request has already been processed.' }
    }

    await logAudit({
      action: 'CHURCH_DELETION_REJECTED',
      entity: 'ChurchDeletionRequest',
      entityId: id,
      beforeData: { status: 'Pending' },
      afterData: {
        status: 'Rejected',
        rejection_reason: trimmed,
        request_id: id,
      },
      metadata: {
        church_code: request.church.church_code,
        rejected_by_email: actorEmail,
      },
    })

    revalidatePath('/dashboard/church-deletion-requests')
    revalidatePath('/dashboard/regional')
    return { success: true as const }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reject deletion request.'
    return { error: message }
  }
}

// ----------------------------------------------------------------------------
// Reads
// ----------------------------------------------------------------------------

/**
 * National approval queue. Sorted Pending-first (across statuses the string
 * `'Pending'` does NOT sort before `'Approved'`/`'Rejected'` alphabetically,
 * so the pivot is done in JS), then oldest-first within each bucket.
 */
export async function getChurchDeletionRequests(): Promise<ChurchDeletionRequestRow[]> {
  try {
    await verifyOperationsAccess()

    const requests = await prisma.churchDeletionRequest.findMany({
      include: {
        church: {
          select: {
            church_code: true,
            church_name: true,
            region: { select: { name: true } },
          },
        },
      },
      orderBy: { proposed_at: 'asc' },
    })

    const pendingFirst = [...requests].sort((a, b) => {
      const aPending = a.status === 'Pending' ? 0 : 1
      const bPending = b.status === 'Pending' ? 0 : 1
      return aPending - bPending
    })

    const userIds = [
      ...new Set([
        ...pendingFirst.map((r) => r.proposed_by),
        ...pendingFirst.map((r) => r.reviewed_by).filter((x): x is string => !!x),
      ]),
    ]
    const users =
      userIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, email: true },
          })
        : []
    const emailMap = new Map(users.map((u) => [u.id, u.email ?? '']))

    const now = new Date()
    return pendingFirst.map((r) => {
      const age = daysBetween(r.proposed_at, now)
      return {
        id: r.id,
        church_id: r.church_id,
        church_code: r.church.church_code,
        church_name: r.church.church_name,
        region_name: r.church.region?.name ?? '—',
        reason: r.reason,
        reason_category: reasonCategory(r.reason),
        notes: r.notes,
        status: r.status,
        proposed_by: r.proposed_by,
        proposed_by_email: emailMap.get(r.proposed_by) ?? '',
        proposed_at: r.proposed_at.toISOString(),
        reviewed_by: r.reviewed_by,
        reviewed_by_email: r.reviewed_by ? (emailMap.get(r.reviewed_by) ?? '') : null,
        reviewed_at: r.reviewed_at?.toISOString() ?? null,
        rejection_reason: r.rejection_reason,
        resulted_in_deletion: r.resulted_in_deletion,
        days_old: age,
        sla_status: computeSlaStatus(age),
      }
    })
  } catch (error) {
    console.error('Failed to fetch church deletion requests:', error)
    return []
  }
}

/** Regional caller's own submissions, newest first. */
export async function getMyChurchDeletionRequests(): Promise<ChurchDeletionRequestRow[]> {
  try {
    const { actorId, actorEmail } = await verifyReportsAccess()

    const requests = await prisma.churchDeletionRequest.findMany({
      where: { proposed_by: actorId },
      include: {
        church: {
          select: {
            church_code: true,
            church_name: true,
            region: { select: { name: true } },
          },
        },
      },
      orderBy: { proposed_at: 'desc' },
    })

    const reviewerIds = [
      ...new Set(requests.map((r) => r.reviewed_by).filter((x): x is string => !!x)),
    ]
    const reviewers =
      reviewerIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: reviewerIds } },
            select: { id: true, email: true },
          })
        : []
    const reviewerEmailMap = new Map(reviewers.map((u) => [u.id, u.email ?? '']))

    const now = new Date()
    return requests.map((r) => {
      const age = daysBetween(r.proposed_at, now)
      return {
        id: r.id,
        church_id: r.church_id,
        church_code: r.church.church_code,
        church_name: r.church.church_name,
        region_name: r.church.region?.name ?? '—',
        reason: r.reason,
        reason_category: reasonCategory(r.reason),
        notes: r.notes,
        status: r.status,
        proposed_by: r.proposed_by,
        proposed_by_email: actorEmail ?? '',
        proposed_at: r.proposed_at.toISOString(),
        reviewed_by: r.reviewed_by,
        reviewed_by_email: r.reviewed_by ? (reviewerEmailMap.get(r.reviewed_by) ?? '') : null,
        reviewed_at: r.reviewed_at?.toISOString() ?? null,
        rejection_reason: r.rejection_reason,
        resulted_in_deletion: r.resulted_in_deletion,
        days_old: age,
        sla_status: computeSlaStatus(age),
      }
    })
  } catch (error) {
    console.error('Failed to fetch my church deletion requests:', error)
    return []
  }
}

/**
 * Sidebar badge count. Self-guarded — returns 0 on any auth failure so the
 * dashboard layout never throws for `FINANCE_ADMIN` / `NATIONAL_OVERSEER`.
 */
export async function getPendingChurchDeletionCount(): Promise<number> {
  try {
    await verifyOperationsAccess()
    return await prisma.churchDeletionRequest.count({ where: { status: 'Pending' } })
  } catch {
    return 0
  }
}

/**
 * Duplicate-check for the Regional table's disabled-action tooltip. Returns
 * null when no pending request exists or on any read failure — the tooltip
 * then hides, which is the safe default.
 */
export async function getPendingRequestForChurch(churchId: string): Promise<{
  id: string
  proposedAt: string
  daysOld: number
} | null> {
  try {
    await verifyReportsAccess()
    const request = await prisma.churchDeletionRequest.findFirst({
      where: { church_id: churchId, status: 'Pending' },
      select: { id: true, proposed_at: true },
    })
    if (!request) return null
    const now = new Date()
    return {
      id: request.id,
      proposedAt: request.proposed_at.toISOString(),
      daysOld: daysBetween(request.proposed_at, now),
    }
  } catch {
    return null
  }
}

/**
 * Loads the concrete impact of approving this deletion (used by the approve
 * dialog on mount). Returns a discriminated `{ error }` on guard failure so
 * the caller can render a disabled state cleanly.
 */
export async function getChurchDeletionImpact(churchId: string): Promise<
  | {
      userCount: number
      userEmails: string[]
      blockedBy: Array<{
        type: 'pending_payment' | 'pending_writeoff' | 'pending_unmatched'
        count: number
      }>
    }
  | { error: string }
> {
  try {
    await verifyOperationsAccess()

    const church = await prisma.church.findUnique({
      where: { id: churchId },
      select: { deleted_at: true },
    })
    if (!church) return { error: 'Church not found.' }
    if (church.deleted_at) return { error: 'Church is already deleted.' }

    const [users, pendingPayments, pendingWriteOffs, pendingUnmatched] = await Promise.all([
      prisma.user.findMany({
        where: { church_id: churchId, is_active: true },
        select: { email: true },
      }),
      prisma.pendingPayment.count({ where: { church_id: churchId, status: 'Pending' } }),
      prisma.writeOff.count({ where: { church_id: churchId, status: 'Pending' } }),
      prisma.unmatchedPayment.count({
        where: { assigned_church_id: churchId, status: 'Pending' },
      }),
    ])

    const blockedBy: Array<{
      type: 'pending_payment' | 'pending_writeoff' | 'pending_unmatched'
      count: number
    }> = []
    if (pendingPayments > 0) blockedBy.push({ type: 'pending_payment', count: pendingPayments })
    if (pendingWriteOffs > 0) blockedBy.push({ type: 'pending_writeoff', count: pendingWriteOffs })
    if (pendingUnmatched > 0) blockedBy.push({ type: 'pending_unmatched', count: pendingUnmatched })

    return {
      userCount: users.length,
      userEmails: users.map((u) => u.email ?? '(no email)'),
      blockedBy,
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to load deletion impact.',
    }
  }
}


/**
 * Region-scoped pending-deletions lookup for the Regional table's proactive
 * disable-with-label UX. Returns a map keyed by `church_id` so the table can
 * grey out the "Request Deletion" item without N per-row queries.
 *
 * Spec B4 UX named `getPendingRequestForChurch(churchId)` as the mechanism,
 * but that's per-church (N queries) AND cannot disable the action before
 * click. This pre-fetches once per page load — the enterprise fix.
 * `getPendingRequestForChurch` stays in place as a defensive check inside
 * the dialog; both guards fire, but the map is the primary UX driver.
 *
 * User-scoped (not just proposer-scoped): both Regional Chairman AND
 * Regional Treasurer see the disabled state when EITHER has a pending
 * request for the same church. This matches the intent — the pending
 * request is a property of the church, not of the individual proposer.
 */
export async function getPendingDeletionsForMyRegion(): Promise<
  Record<string, { id: string; daysOld: number }>
> {
  try {
    const { dbUser } = await verifyReportsAccess()
    if (!dbUser.region_id) return {}

    const requests = await prisma.churchDeletionRequest.findMany({
      where: {
        status: 'Pending',
        church: { region_id: dbUser.region_id },
      },
      select: { id: true, church_id: true, proposed_at: true },
    })

    const now = new Date()
    const map: Record<string, { id: string; daysOld: number }> = {}
    for (const r of requests) {
      map[r.church_id] = { id: r.id, daysOld: daysBetween(r.proposed_at, now) }
    }
    return map
  } catch (error) {
    console.error('Failed to fetch pending deletions for region:', error)
    return {}
  }
}