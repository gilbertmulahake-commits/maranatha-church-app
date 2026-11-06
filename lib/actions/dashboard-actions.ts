'use server'

// ============================================================================
// NATIONAL DASHBOARD STATS
// Computes every figure needed by the four National KPI cards, including:
//   - Lifetime collected (split Annual / Monthly)
//   - Lifetime expected (split Annual / Monthly, cumulative from each church's
//     created_at so year-end arrears never vanish)
//   - Lifetime outstanding (split Annual / Monthly, clamped at 0)
//   - Compliance counts (Paid / Partial / Overdue) using getPeriodStatus so
//     the count matches the badge the user sees in the tables
//   - This Month collected (split Annual / Monthly) plus expected-for-this-month
//     (this month's increment + any arrears brought forward from last month)
//   - Payment-method counts and 6-month chart series
// ============================================================================

import { prisma } from '@/lib/prisma'
import { getExpectedUpToDate, getPeriodStatus } from '@/lib/utils/financial'

export async function getDashboardStats() {
  try {
    const churches = await prisma.church.findMany({
      include: { payments: { where: { status: 'Paid' } } },
    })

    const totalChurches = churches.length
    const totalRegions = await prisma.region.count()

    // --- Date boundaries for "This Month" calculations ---
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const endOfLastMonth = new Date(startOfMonth.getTime() - 1)

    // --- Lifetime accumulators ---
    let totalCollected = 0
    let totalCollectedAnnual = 0
    let totalCollectedMonthly = 0
    let totalExpected = 0
    let totalExpectedAnnual = 0
    let totalExpectedMonthly = 0

    // --- This Month accumulators ---
    let thisMonthCollectedAnnual = 0
    let thisMonthCollectedMonthly = 0
    let thisMonthExpected = 0
    let thisMonthTransactionCount = 0

    // --- Compliance counts (overall status per church) ---
    let compliantChurches = 0
    let partialChurches = 0
    let overdueChurches = 0

    // --- Payment method counts ---
    let mpesaCount = 0
    let bankCount = 0
    let cashCount = 0

    // --- Chart: last 6 months bucket ---
    const monthlyMap: Record<string, number> = {}
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      monthlyMap[monthNames[d.getMonth()]] = 0
    }

    churches.forEach((church) => {
      // --- Cumulative expected: today vs last month ---
      const {
        expectedAnnual,
        expectedMonthly,
        totalExpected: churchExpectedToday,
      } = getExpectedUpToDate(church.created_at, today)

      const { totalExpected: churchExpectedLastMonth } = getExpectedUpToDate(
        church.created_at,
        endOfLastMonth
      )

      totalExpectedAnnual += expectedAnnual
      totalExpectedMonthly += expectedMonthly
      totalExpected += churchExpectedToday

      // Expected just this month (increment over last month's cutoff)
      const churchExpectedThisMonth = Math.max(0, churchExpectedToday - churchExpectedLastMonth)

      // --- Per-church payment iteration ---
      let churchTotalPaid = 0
      let churchPaidLastMonth = 0

      church.payments.forEach((payment) => {
        const amount = Number(payment.amount_paid)
        churchTotalPaid += amount
        const pDate = new Date(payment.payment_date)

        // Split into Annual / Monthly buckets
        if (payment.payment_type === 'Annual') totalCollectedAnnual += amount
        else totalCollectedMonthly += amount

        // This Month collected + transaction count
        if (pDate >= startOfMonth) {
          if (payment.payment_type === 'Annual') thisMonthCollectedAnnual += amount
          else thisMonthCollectedMonthly += amount
          thisMonthTransactionCount++
        }

        // Pre-this-month collected (for arrears-brought-forward calc)
        if (pDate < startOfMonth) churchPaidLastMonth += amount

        // Chart bucket
        if (pDate.getMonth() === today.getMonth() && pDate.getFullYear() === today.getFullYear()) {
          const pMonthName = monthNames[pDate.getMonth()]
          if (monthlyMap[pMonthName] !== undefined) monthlyMap[pMonthName] += amount
        }

        // Method counters
        if (payment.payment_method === 'M_Pesa') mpesaCount++
        else if (payment.payment_method === 'Bank_Transfer') bankCount++
        else if (payment.payment_method === 'Cash') cashCount++
      })

      totalCollected += churchTotalPaid

      // Expected this month = increment + carried-forward arrears
      const arrearsBroughtForward = Math.max(0, churchExpectedLastMonth - churchPaidLastMonth)
      thisMonthExpected += churchExpectedThisMonth + arrearsBroughtForward

      // Compliance: uses the same overall status the tables show when no toggle is applied
      const churchStatus = getPeriodStatus(churchTotalPaid, churchExpectedToday)
      if (churchStatus === 'Paid') compliantChurches++
      else if (churchStatus === 'Partial') partialChurches++
      else overdueChurches++
    })

    // --- Roll-ups ---
    const outstanding = Math.max(0, totalExpected - totalCollected)
    const outstandingAnnual = Math.max(0, totalExpectedAnnual - totalCollectedAnnual)
    const outstandingMonthly = Math.max(0, totalExpectedMonthly - totalCollectedMonthly)
    const collectionPct = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0
    const compliancePct = totalChurches > 0 ? (compliantChurches / totalChurches) * 100 : 0

    const thisMonthCollections = thisMonthCollectedAnnual + thisMonthCollectedMonthly
    const thisMonthCollectionPct =
      thisMonthExpected > 0 ? (thisMonthCollections / thisMonthExpected) * 100 : 0

    const monthlyCollections = Object.keys(monthlyMap).map((month) => ({
      name: month,
      amount: monthlyMap[month],
    }))

    return {
      // Lifetime
      totalCollected,
      totalCollectedAnnual,
      totalCollectedMonthly,
      totalExpected,
      totalExpectedAnnual,
      totalExpectedMonthly,
      outstanding,
      outstandingAnnual,
      outstandingMonthly,
      collectionPct,

      // Compliance
      compliancePct,
      compliantChurches,
      partialChurches,
      overdueChurches,
      totalChurches,
      totalRegions,

      // This Month
      thisMonthCollectedAnnual,
      thisMonthCollectedMonthly,
      thisMonthCollections,
      thisMonthExpected,
      thisMonthCollectionPct,
      thisMonthTransactionCount,

      // Misc
      paymentMethods: { mpesa: mpesaCount, bank: bankCount, cash: cashCount },
      monthlyCollections,
    }
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error)
    // Return a fully-zero shape so the UI never renders undefined
    return {
      totalCollected: 0,
      totalCollectedAnnual: 0,
      totalCollectedMonthly: 0,
      totalExpected: 0,
      totalExpectedAnnual: 0,
      totalExpectedMonthly: 0,
      outstanding: 0,
      outstandingAnnual: 0,
      outstandingMonthly: 0,
      collectionPct: 0,
      compliancePct: 0,
      compliantChurches: 0,
      partialChurches: 0,
      overdueChurches: 0,
      totalChurches: 0,
      totalRegions: 0,
      thisMonthCollectedAnnual: 0,
      thisMonthCollectedMonthly: 0,
      thisMonthCollections: 0,
      thisMonthExpected: 0,
      thisMonthCollectionPct: 0,
      thisMonthTransactionCount: 0,
      paymentMethods: { mpesa: 0, bank: 0, cash: 0 },
      monthlyCollections: [],
    }
  }
}