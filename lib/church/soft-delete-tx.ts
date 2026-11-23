import type { Prisma } from '@prisma/client'

/**
 * Soft-delete a church and deactivate all attached users, atomically.
 * MUST be called inside `prisma.$transaction`. Does NOT log audit events —
 * callers log after the transaction commits (per `architecture.md` § 8
 * "AuditLog" — `logAudit()` must never run inside the transaction).
 *
 * Unit 20.6a: replaced the previous hard `prisma.church.delete`. Hard delete
 * is FK-blocked by Payment / WriteOff / PendingPayment / PaymentIntent
 * (required relations default to Restrict). Soft delete preserves the
 * financial trail and audit-log traceability while removing the church from
 * active views.
 *
 * Unit 20.6b: extracted from `church-actions.ts` to this shared utility
 * because `approveChurchDeletionRequest` (in
 * `lib/actions/church-deletion-request-actions.ts`) is a second caller.
 * Deliberately NOT exported from a `'use server'` file — its first parameter
 * (`Prisma.TransactionClient`) is not serializable, so exposing it as a
 * Server Action would fail at call time. `lib/church/` is a pure
 * server-side helper module, imported only by other server-action files.
 */
export async function softDeleteChurchTx(
  tx: Prisma.TransactionClient,
  churchId: string
): Promise<{ deactivatedUserIds: string[] }> {
  await tx.church.update({
    where: { id: churchId },
    data: { deleted_at: new Date() },
  })
  const users = await tx.user.findMany({
    where: { church_id: churchId, is_active: true },
    select: { id: true },
  })
  if (users.length > 0) {
    await tx.user.updateMany({
      where: { id: { in: users.map((u) => u.id) } },
      data: { is_active: false },
    })
  }
  return { deactivatedUserIds: users.map((u) => u.id) }
}