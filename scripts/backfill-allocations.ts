// ============================================================================
// ONE-TIME MIGRATION SCRIPT — DO NOT RUN IN PRODUCTION MORE THAN ONCE
//
// Purpose: Retroactively creates PaymentAllocation rows for every existing
// Payment that predates the allocation engine. Without this, the engine
// cannot compute correct outstanding balances for churches with history.
//
// Strategy: For each Payment without allocations, split its amount into
// per-year (Annual) or per-month (Monthly) allocation records based on the
// payment_type, billing_year, and payment_date.
//
// Safe to re-run: The `where: { allocations: { none: {} } }` filter means
// payments that already have allocations are skipped, so no duplicates.
// ============================================================================

// Load .env variables BEFORE Prisma client is instantiated
import 'dotenv/config'

// ============================================================================
// ONE-TIME MIGRATION SCRIPT...
// ============================================================================

import { prisma } from '../lib/prisma'

const ANNUAL_FEE = 5000
const MONTHLY_FEE = 500

interface AllocationDraft {
  allocation_type: 'Annual' | 'Monthly'
  billing_year: number
  billing_month: number | null
  amount: number
}

function buildAllocations(
  paymentType: 'Annual' | 'Monthly',
  amount: number,
  billingYear: number,
  paymentDate: Date
): AllocationDraft[] {
  const allocations: AllocationDraft[] = []

  if (paymentType === 'Annual') {
    const yearsCovered = Math.floor(amount / ANNUAL_FEE)
    const remainder = amount - yearsCovered * ANNUAL_FEE

    for (let i = 0; i < yearsCovered; i++) {
      allocations.push({
        allocation_type: 'Annual',
        billing_year: billingYear + i,
        billing_month: null,
        amount: ANNUAL_FEE,
      })
    }

    if (remainder > 0) {
      allocations.push({
        allocation_type: 'Annual',
        billing_year: billingYear + yearsCovered,
        billing_month: null,
        amount: remainder,
      })
    }
  } else {
    // Monthly — spread from the payment's own month forward
    const monthsCovered = Math.floor(amount / MONTHLY_FEE)
    const remainder = amount - monthsCovered * MONTHLY_FEE

    let year = billingYear
    let month = paymentDate.getMonth() + 1 // 1-12

    for (let i = 0; i < monthsCovered; i++) {
      allocations.push({
        allocation_type: 'Monthly',
        billing_year: year,
        billing_month: month,
        amount: MONTHLY_FEE,
      })
      month += 1
      if (month > 12) {
        month = 1
        year += 1
      }
    }

    if (remainder > 0) {
      allocations.push({
        allocation_type: 'Monthly',
        billing_year: year,
        billing_month: month,
        amount: remainder,
      })
    }
  }

  return allocations
}

async function main() {
  console.log('🚀 Starting backfill of PaymentAllocation records...\n')

  // 1. Fetch all payments that have NO allocations yet
  const payments = await prisma.payment.findMany({
    where: { allocations: { none: {} } },
    include: { church: true },
    orderBy: { payment_date: 'asc' },
  })

  console.log(`📊 Found ${payments.length} payments needing backfill\n`)

  if (payments.length === 0) {
    console.log('✅ Nothing to backfill. All payments already have allocations.')
    return
  }

  let successCount = 0
  let skipCount = 0
  let errorCount = 0
  let totalAllocationsCreated = 0

  // 2. Process each payment
  for (const payment of payments) {
    try {
      const amount = Number(payment.amount_paid)

      if (amount <= 0) {
        console.log(`⏭️  ${payment.transaction_id}: skipped (zero amount)`)
        skipCount++
        continue
      }

      const billingYear =
        payment.billing_year || new Date(payment.payment_date).getFullYear()

      const allocationDrafts = buildAllocations(
        payment.payment_type as 'Annual' | 'Monthly',
        amount,
        billingYear,
        new Date(payment.payment_date)
      )

      if (allocationDrafts.length === 0) {
        console.log(`⏭️  ${payment.transaction_id}: skipped (no drafts generated)`)
        skipCount++
        continue
      }

      // 3. Bulk insert — one round-trip per payment
      await prisma.paymentAllocation.createMany({
        data: allocationDrafts.map((a) => ({
          payment_id: payment.id,
          allocation_type: a.allocation_type,
          billing_year: a.billing_year,
          billing_month: a.billing_month,
          amount: a.amount,
        })),
      })

      totalAllocationsCreated += allocationDrafts.length
      successCount++
      console.log(
        `✅ ${payment.transaction_id} (${payment.church.church_code}, ${payment.payment_type}, KES ${amount.toLocaleString()}) → ${allocationDrafts.length} allocations`
      )
    } catch (error) {
      errorCount++
      console.error(`❌ ${payment.transaction_id}:`, error)
    }
  }

  // 4. Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 BACKFILL COMPLETE')
  console.log('='.repeat(60))
  console.log(`   ✅ Payments processed:    ${successCount}`)
  console.log(`   ⏭️  Payments skipped:      ${skipCount}`)
  console.log(`   ❌ Payments errored:      ${errorCount}`)
  console.log(`   📦 Allocations created:   ${totalAllocationsCreated}`)
  console.log('='.repeat(60))
}

main()
  .catch((e) => {
    console.error('💥 Fatal error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })