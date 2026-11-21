'use server'

import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/actions/audit-actions'
import { verifyChurchPaymentAccess } from '@/lib/auth/guards'
import {
  PAYMENT_INTENT_AMOUNT_CEILING,
  PAYMENT_INTENT_EXPIRY_MINUTES,
  PAYMENT_INTENT_GRACE_SECONDS,
  PRISMA_TRANSACTION_TIMEOUT,
} from '@/lib/constants'

const createIntentSchema = z.object({
  churchId: z.string().uuid(),
  amount: z.coerce.number().positive().max(PAYMENT_INTENT_AMOUNT_CEILING),
  paymentType: z.enum(['Annual', 'Monthly']),
  rawBillRef: z.string().min(1).max(50),
})

const CHURCH_SCOPED_ROLES = ['CHURCH_TREASURER', 'LOCAL_PASTOR'] as const

function isForbidden(error: unknown): boolean {
  return error instanceof Error && error.message.includes('Forbidden')
}
function isUnauthorized(error: unknown): boolean {
  return error instanceof Error && error.message.includes('Unauthorized')
}

type MatchedPayment = {
  transactionId: string
  amount: number
  allocations: { type: string; year: number; month: number | null; amount: number }[]
}

export type PaymentIntentPollResult =
  | { status: 'Active' }
  | { status: 'Matched'; payment: MatchedPayment; matched_payment_id: string }
  | { status: 'Unmatched'; matched_unmatched_id: string }
  | { status: 'Expired' }
  | { status: 'Abandoned' }

function toMatchedPayment(p: {
  transaction_id: string
  amount_paid: Prisma.Decimal
  allocations: { allocation_type: string; billing_year: number; billing_month: number | null; amount: Prisma.Decimal }[]
}): MatchedPayment {
  return {
    transactionId: p.transaction_id,
    amount: Number(p.amount_paid),
    allocations: p.allocations.map((a) => ({
      type: a.allocation_type,
      year: a.billing_year,
      month: a.billing_month,
      amount: Number(a.amount),
    })),
  }
}

export async function createPaymentIntent(
  formData: FormData
): Promise<{ intentId: string; expiresAt: string } | { error: string }> {
  try {
    const parsed = createIntentSchema.safeParse(Object.fromEntries(formData))
    if (!parsed.success) {
      return { error: 'Invalid input' }
    }
    const { churchId, amount, paymentType, rawBillRef } = parsed.data

    const auth = await verifyChurchPaymentAccess(churchId)

    const church = await prisma.church.findUnique({
      where: { id: churchId },
      select: { church_code: true, deleted_at: true, is_defunct: true },
    })
    if (!church) return { error: 'Church not found' }
    // Unit 20.6a: deleted churches cannot receive new payment intents.
    // Checked before the defunct guard because "deleted" is the stronger,
    // later state.
    if (church.deleted_at) return { error: 'Church is deleted' }
    // Pre-existing gap fixed in-session (Never Defer Bugs): createManualEntry
    // rejects defunct churches but the wizard accepted them. Same policy.
    if (church.is_defunct) return { error: 'Church is marked defunct' }

    if (
      (CHURCH_SCOPED_ROLES as readonly string[]).includes(auth.actorRole) &&
      rawBillRef !== church.church_code
    ) {
      return { error: 'Church code mismatch' }
    }

    const expiresAt = new Date(Date.now() + PAYMENT_INTENT_EXPIRY_MINUTES * 60_000)

    const intent = await prisma.paymentIntent.create({
      data: {
        church_id: churchId,
        amount,
        payment_type: paymentType,
        channel: 'Manual',
        status: 'Active',
        raw_bill_ref_entered: rawBillRef,
        created_by: auth.actorId,
        expires_at: expiresAt,
      },
    })

    return { intentId: intent.id, expiresAt: expiresAt.toISOString() }
  } catch (error) {
    if (isForbidden(error)) return { error: 'Forbidden' }
    if (isUnauthorized(error)) return { error: 'Unauthorized' }
    console.error('createPaymentIntent failed:', error)
    return { error: 'Internal Server Error' }
  }
}

export async function pollPaymentIntent(
  intentId: string
): Promise<PaymentIntentPollResult | { error: string }> {
  try {
    const intent = await prisma.paymentIntent.findUnique({ where: { id: intentId } })
    if (!intent) return { error: 'Intent not found' }

    await verifyChurchPaymentAccess(intent.church_id)

    // Terminal states — return as-is, do not re-match
    if (intent.status === 'Matched') {
      if (!intent.matched_payment_id) return { status: 'Active' }
      const payment = await prisma.payment.findUnique({
        where: { id: intent.matched_payment_id },
        include: { allocations: true },
      })
      if (!payment) return { status: 'Active' }
      return {
        status: 'Matched',
        payment: toMatchedPayment(payment),
        matched_payment_id: intent.matched_payment_id,
      }
    }
    if (intent.status === 'Unmatched') {
      if (!intent.matched_unmatched_id) return { status: 'Active' }
      return { status: 'Unmatched', matched_unmatched_id: intent.matched_unmatched_id }
    }
    if (intent.status === 'Expired') return { status: 'Expired' }
    if (intent.status === 'Abandoned') return { status: 'Abandoned' }

    // Active — check expiry first
    const now = new Date()
    if (now > intent.expires_at) {
      await prisma.paymentIntent.update({
        where: { id: intent.id },
        data: { status: 'Expired' },
      })
      await logAudit({
        action: 'PAYMENT_INTENT_EXPIRED',
        entity: 'PaymentIntent',
        entityId: intent.id,
        beforeData: { status: 'Active' },
        afterData: { status: 'Expired' },
      })
      return { status: 'Expired' }
    }

    // TODO(19c): dispatch on intent.channel → provider.query(). Manual-only for now.
    const windowStart = new Date(intent.created_at.getTime() - PAYMENT_INTENT_GRACE_SECONDS * 1000)
    const windowEnd = intent.expires_at

    let result: PaymentIntentPollResult
    try {
      result = await prisma.$transaction(
        async (tx) => {
          const claimedPaymentIds = await tx.paymentIntent.findMany({
            where: { matched_payment_id: { not: null } },
            select: { matched_payment_id: true },
          })
          const claimedPaymentSet = new Set(
            claimedPaymentIds.map((r) => r.matched_payment_id as string)
          )

          const paymentCandidates = await tx.payment.findMany({
            where: {
              church_id: intent.church_id,
              status: 'Paid',
              source: 'Webhook',
              payment_method: 'M_Pesa',
              created_at: { gte: windowStart, lte: windowEnd },
            },
            include: { allocations: true },
          })

          const paymentMatch = paymentCandidates.find(
            (p) => p.amount_paid.equals(intent.amount) && !claimedPaymentSet.has(p.id)
          )

          if (paymentMatch) {
            await tx.paymentIntent.update({
              where: { id: intent.id },
              data: {
                status: 'Matched',
                matched_payment_id: paymentMatch.id,
                matched_at: new Date(),
              },
            })
            return {
              status: 'Matched',
              payment: toMatchedPayment(paymentMatch),
              matched_payment_id: paymentMatch.id,
            }
          }

          const claimedUnmatchedIds = await tx.paymentIntent.findMany({
            where: { matched_unmatched_id: { not: null } },
            select: { matched_unmatched_id: true },
          })
          const claimedUnmatchedSet = new Set(
            claimedUnmatchedIds.map((r) => r.matched_unmatched_id as string)
          )

          const unmatchedCandidates = await tx.unmatchedPayment.findMany({
            where: {
              status: 'Pending',
              created_at: { gte: windowStart, lte: windowEnd },
            },
          })

          const unmatchedMatch = unmatchedCandidates.find(
            (u) => u.amount.equals(intent.amount) && !claimedUnmatchedSet.has(u.id)
          )

          if (unmatchedMatch) {
            await tx.paymentIntent.update({
              where: { id: intent.id },
              data: {
                status: 'Unmatched',
                matched_unmatched_id: unmatchedMatch.id,
                matched_at: new Date(),
              },
            })
            return { status: 'Unmatched', matched_unmatched_id: unmatchedMatch.id }
          }

          return { status: 'Active' }
        },
        { timeout: PRISMA_TRANSACTION_TIMEOUT }
      )
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        // Another intent claimed the same payment concurrently; stay Active and retry next poll.
        return { status: 'Active' }
      }
      throw err
    }

    // Post-commit audit (never inside the $transaction)
    if (result.status === 'Matched') {
      await logAudit({
        action: 'PAYMENT_INTENT_MATCHED',
        entity: 'PaymentIntent',
        entityId: intent.id,
        beforeData: { status: 'Active' },
        afterData: {
          status: 'Matched',
          matched_payment_id: result.matched_payment_id,
          transaction_id: result.payment.transactionId,
          amount: result.payment.amount,
        },
      })
    } else if (result.status === 'Unmatched') {
      await logAudit({
        action: 'PAYMENT_INTENT_UNMATCHED',
        entity: 'PaymentIntent',
        entityId: intent.id,
        beforeData: { status: 'Active' },
        afterData: { status: 'Unmatched', matched_unmatched_id: result.matched_unmatched_id },
      })
    }

    return result
  } catch (error) {
    if (isForbidden(error)) return { error: 'Forbidden' }
    if (isUnauthorized(error)) return { error: 'Unauthorized' }
    console.error('pollPaymentIntent failed:', error)
    return { error: 'Internal Server Error' }
  }
}

export async function abandonPaymentIntent(
  intentId: string
): Promise<{ success: true } | { error: string }> {
  try {
    const intent = await prisma.paymentIntent.findUnique({ where: { id: intentId } })
    if (!intent) return { error: 'Intent not found' }

    await verifyChurchPaymentAccess(intent.church_id)

    if (intent.status !== 'Active') return { success: true }

    await prisma.paymentIntent.update({
      where: { id: intent.id },
      data: { status: 'Abandoned', abandoned_at: new Date() },
    })

    await logAudit({
      action: 'PAYMENT_INTENT_ABANDONED',
      entity: 'PaymentIntent',
      entityId: intent.id,
      beforeData: { status: 'Active' },
      afterData: { status: 'Abandoned' },
    })

    return { success: true }
  } catch (error) {
    if (isForbidden(error)) return { error: 'Forbidden' }
    if (isUnauthorized(error)) return { error: 'Unauthorized' }
    console.error('abandonPaymentIntent failed:', error)
    return { error: 'Internal Server Error' }
  }
}