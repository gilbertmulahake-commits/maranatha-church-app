import { sendSms } from '@/lib/actions/sms-actions'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { computeExpectedPeriods, calculateAllocations } from '@/lib/utils/allocation'

const kcbWebhookSchema = z.object({
  TransID: z.string(),
  TransAmount: z.coerce.number(),
  BillRefNumber: z.string(),
  MSISDN: z.string(),
  TransTime: z.string(),
  FirstName: z.string().optional(),
  payment_type: z.enum(['Monthly', 'Annual', 'Auto']).default('Auto'), // Default changed to Auto for safety
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

    // 1. Idempotency — reject duplicate webhook retries
    const existingPayment = await prisma.payment.findUnique({
      where: { transaction_id: TransID },
    })
    if (existingPayment) {
      return NextResponse.json(
        { message: 'Payment already processed (Idempotent)' },
        { status: 200 }
      )
    }

    // 2. Find the church + load existing allocations (needed for Auto mode)
    const church = await prisma.church.findUnique({
      where: { church_code: BillRefNumber },
      include: {
        payments: {
          include: { allocations: true },
        },
      },
    })

    if (!church) {
      return NextResponse.json(
        { error: `Unmatched Payment: Church ID '${BillRefNumber}' not found.` },
        { status: 404 }
      )
    }

    // 3. Parse transaction date ONCE
    const transDate = new Date(TransTime)

    // 4. Flatten existing allocations — convert Prisma.Decimal → number for the helper
    const existingAllocations = church.payments.flatMap((p) =>
      p.allocations.map((a) => ({
        allocation_type: a.allocation_type,
        billing_year: a.billing_year,
        billing_month: a.billing_month,
        amount: Number(a.amount),
      }))
    )

    // 5. Compute allocations based on payment_type
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

    // 6. For Auto mode, Payment.payment_type needs a stored value — default to Annual.
    const storedPaymentType = payment_type === 'Auto' ? 'Annual' : payment_type

    // 7. Create Payment + all Allocations in ONE atomic transaction
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
            month_covered: transDate.toLocaleString('default', {
              month: 'long',
              year: 'numeric',
            }),
            billing_year: billing_year || transDate.getFullYear(),
          },
        })

        // Bulk insert — one DB round-trip regardless of allocation count
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

    // 8. Automated SMS receipt
    const smsMessage = `Payment of KES ${TransAmount.toLocaleString()} for ${church.church_name} (${BillRefNumber}) received. Ref: ${TransID}. Thank you. - Maranatha`
    await sendSms(MSISDN, smsMessage, 'Receipt')

    // 9. Return success
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