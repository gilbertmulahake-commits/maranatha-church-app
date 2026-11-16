import { sendSms } from '@/lib/actions/sms-actions'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { computeExpectedPeriods, calculateAllocations } from '@/lib/utils/allocation'
import { logAudit } from '@/lib/actions/audit-actions'
import { suggestMatches } from '@/lib/utils/matching'

const kcbWebhookSchema = z.object({
  TransID: z.string(),
  TransAmount: z.coerce.number(),
  BillRefNumber: z.string(),
  MSISDN: z.string(),
  TransTime: z.string(),
  FirstName: z.string().optional(),
  payment_type: z.enum(['Monthly', 'Annual', 'Auto']).default('Auto'),
  billing_year: z.coerce.number().optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validatedData = kcbWebhookSchema.safeParse(body)

    if (!validatedData.success) {
      return NextResponse.json(
        { error: 'Invalid webhook payload', details: validatedData.error.issues },
        { status: 400 }
      )
    }

    const { TransID, TransAmount, BillRefNumber, MSISDN, TransTime, payment_type, billing_year } =
      validatedData.data

    // 1. Idempotency — check both Payment AND UnmatchedPayment
    const [existingPayment, existingUnmatched] = await Promise.all([
      prisma.payment.findUnique({ where: { transaction_id: TransID } }),
      prisma.unmatchedPayment.findUnique({ where: { bank_reference: TransID } }),
    ])

    if (existingPayment || existingUnmatched) {
      return NextResponse.json(
        { message: 'Transaction already received (Idempotent)' },
        { status: 200 }
      )
    }

    // 2. Find the church + load existing allocations
    const church = await prisma.church.findUnique({
      where: { church_code: BillRefNumber },
      include: {
        payments: {
          include: { allocations: true },
        },
      },
    })

    // 3. UNMATCHED BRANCH — capture for human review, return 200 so bank stops retrying
    if (!church) {
      const suggestions = await suggestMatches(BillRefNumber, 3)
      const topSuggestion = suggestions[0]

      const unmatched = await prisma.unmatchedPayment.create({
        data: {
          bank_reference: TransID,
          bank_name: 'KCB',
          raw_bill_ref: BillRefNumber,
          amount: TransAmount,
          payer_phone: MSISDN,
          raw_payload: body,
          status: 'Pending',
          suggested_church_id: topSuggestion?.church_id ?? null,
          confidence_score: topSuggestion?.confidence ?? null,
        },
      })

      await logAudit({
        action: 'UNMATCHED_PAYMENT_CAPTURED',
        entity: 'UnmatchedPayment',
        entityId: unmatched.id,
        beforeData: null,
        afterData: {
          bank_reference: TransID,
          raw_bill_ref: BillRefNumber,
          amount: TransAmount,
          suggested_church_code: topSuggestion?.church_code ?? null,
          confidence_score: topSuggestion?.confidence ?? null,
        },
      })

      return NextResponse.json(
        {
          message: 'Payment captured as unmatched — pending manual reconciliation',
          unmatched_id: unmatched.id,
          suggested_church: topSuggestion?.church_code ?? null,
        },
        { status: 200 }
      )
    }

    // 4. Parse transaction date ONCE
    const transDate = new Date(TransTime)

    // 5. Flatten existing allocations
    const existingAllocations = church.payments.flatMap((p) =>
      p.allocations.map((a) => ({
        allocation_type: a.allocation_type,
        billing_year: a.billing_year,
        billing_month: a.billing_month,
        amount: Number(a.amount),
      }))
    )

    // 6. Compute allocations
    let allocations: ReturnType<typeof calculateAllocations>

    if (payment_type === 'Auto') {
      const { expectedAnnuals, expectedMonthlies } = computeExpectedPeriods(
        church.created_at,
        existingAllocations,
        transDate
      )
      allocations = calculateAllocations(TransAmount, expectedAnnuals, expectedMonthlies, transDate)
    } else {
      const targetYear = billing_year || transDate.getFullYear()
      const targetMonth = transDate.getMonth() + 1
      allocations = [
        {
          allocation_type: payment_type,
          billing_year: targetYear,
          billing_month: payment_type === 'Monthly' ? targetMonth : null,
          amount: TransAmount,
        },
      ]
    }

    const storedPaymentType = payment_type === 'Auto' ? 'Annual' : payment_type

    // 7. Create Payment + Allocations in ONE atomic transaction
    const newPayment = await prisma.$transaction(
      async (tx) => {
        const payment = await tx.payment.create({
          data: {
            church_id: church.id,
            transaction_id: TransID,
            payment_type: storedPaymentType,
            amount_paid: TransAmount,
            payment_date: transDate,
            payment_method: 'M_Pesa',
            status: 'Paid',
            source: 'Webhook',
            month_covered: transDate.toLocaleString('default', {
              month: 'long',
              year: 'numeric',
            }),
            billing_year: billing_year || transDate.getFullYear(),
          },
        })

        if (allocations.length > 0) {
          await tx.paymentAllocation.createMany({
            data: allocations.map((alloc) => ({
              payment_id: payment.id,
              allocation_type: alloc.allocation_type,
              billing_year: alloc.billing_year,
              billing_month: alloc.billing_month,
              amount: alloc.amount,
            })),
          })
        }

        return payment
      },
      { timeout: 15000 }
    )

    // 8. Audit Log (after transaction, never inside)
    await logAudit({
      action: 'PAYMENT_RECEIVED',
      entity: 'Payment',
      entityId: newPayment.id,
      beforeData: null,
      afterData: {
        transaction_id: TransID,
        church_code: BillRefNumber,
        amount: TransAmount,
        payment_method: 'M_Pesa',
        payment_type: storedPaymentType,
        allocations: allocations.map((a) => ({
          allocation_type: a.allocation_type,
          amount: a.amount,
          billing_year: a.billing_year,
          billing_month: a.billing_month,
        })),
      },
    })

    // 9. Automated SMS receipt
    const smsMessage = `Payment of KES ${TransAmount.toLocaleString()} for ${church.church_name} (${BillRefNumber}) received. Ref: ${TransID}. Thank you. - Maranatha`
    await sendSms(MSISDN, smsMessage, 'Receipt')

    // 10. Return success
    return NextResponse.json(
      {
        message: 'Payment successfully reconciled',
        payment_id: newPayment.id,
        church_name: church.church_name,
        allocations_count: allocations.length,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}