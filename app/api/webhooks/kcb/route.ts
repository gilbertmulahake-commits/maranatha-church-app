import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// 1. Define the exact shape of the KCB payload we expect
const kcbWebhookSchema = z.object({
  TransID: z.string(),         // Unique transaction ID (Idempotency key)
  TransAmount: z.coerce.number(), // Amount (coerce string to number)
  BillRefNumber: z.string(),   // Church ID (e.g., CH001)
  MSISDN: z.string(),          // Phone number
  TransTime: z.string(),       // Date/Time string
  FirstName: z.string().optional(), // Optional payer name
})

export async function POST(request: Request) {
  try {
    // 2. Parse the incoming JSON body
    const body = await request.json()

    // 3. Validate the payload with Zod
    const validatedData = kcbWebhookSchema.safeParse(body)
    
    if (!validatedData.success) {
      return NextResponse.json(
        { error: 'Invalid webhook payload', details: validatedData.error.issues },
        { status: 400 }
      )
    }

    const { TransID, TransAmount, BillRefNumber, MSISDN, TransTime } = validatedData.data

    // 4. Idempotency Check: Has this transaction already been processed?
    const existingPayment = await prisma.payment.findUnique({
      where: { transaction_id: TransID },
    })

    if (existingPayment) {
      return NextResponse.json({ message: 'Payment already processed (Idempotent)' }, { status: 200 })
    }

    // 5. Reconciliation: Find the church by its code (BillRefNumber)
    const church = await prisma.church.findUnique({
      where: { church_code: BillRefNumber },
    })

    if (!church) {
      // The payment came in, but the Church ID is invalid.
      // In a full production system, we would save this to an "UnmatchedPayment" table.
      return NextResponse.json(
        { error: `Unmatched Payment: Church ID '${BillRefNumber}' not found.` },
        { status: 404 }
      )
    }

    // 6. Save the Payment record
    const newPayment = await prisma.payment.create({
      data: {
        church_id: church.id,
        transaction_id: TransID,
        payment_type: TransAmount >= 5000 ? 'Annual' : 'Monthly', // Basic logic
        amount_paid: TransAmount,
        payment_date: new Date(TransTime),
        payment_method: 'M_Pesa',
        status: 'Paid',
        month_covered: new Date(TransTime).toLocaleString('default', { month: 'long', year: 'numeric' }),
      },
    })

    // 7. Return success
    return NextResponse.json({ 
      message: 'Payment successfully reconciled', 
      payment_id: newPayment.id,
      church_name: church.church_name
    }, { status: 201 })

  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}