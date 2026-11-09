'use server'

import { prisma } from '@/lib/prisma'
import { getExpectedUpToDate, getPeriodStatus } from '@/lib/utils/financial'

export async function getDashboardStats() {
  try {
    const churches = await prisma.church.findMany({
      include: { 
        payments: { 
          where: { status: 'Paid' },
          include: { allocations: true }
        } 
      },
    })

    const totalChurches = churches.length
    const totalRegions = await prisma.region.count()
    
    const recentTransactionsRaw = await prisma.payment.findMany({
      take: 5,
      orderBy: { payment_date: 'desc' },
      include: { church: true },
      where: { status: 'Paid' }
    })

    const recentTransactions = recentTransactionsRaw.map(p => ({
      id: p.id,
      transaction_id: p.transaction_id,
      church_name: p.church.church_name,
      church_code: p.church.church_code,
      amount_paid: Number(p.amount_paid),
      payment_type: p.payment_type,
      payment_date: p.payment_date.toISOString(),
    }))

    const today = new Date()
    const currentYear = today.getFullYear()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const endOfLastMonth = new Date(startOfMonth.getTime() - 1)
    const endOfLastYear = new Date(currentYear - 1, 11, 31, 23, 59, 59, 999)

    let totalCollected = 0
    let totalCollectedAnnual = 0
    let totalCollectedMonthly = 0
    let totalExpected = 0
    let totalExpectedAnnual = 0
    let totalExpectedMonthly = 0

    let totalCollectedThisYear = 0
    let totalExpectedThisYear = 0

    let thisMonthCollectedAnnual = 0
    let thisMonthCollectedMonthly = 0
    let thisMonthExpected = 0
    let thisMonthTransactionCount = 0

    let compliantChurches = 0
    let partialChurches = 0
    let overdueChurches = 0

    let mpesaCount = 0
    let bankCount = 0
    let cashCount = 0

    const monthlyMap: Record<string, number> = {}
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      monthlyMap[monthNames[d.getMonth()]] = 0
    }

    churches.forEach((church) => {
      const { expectedAnnual, expectedMonthly, totalExpected: churchExpectedToday } = getExpectedUpToDate(church.created_at, today)
      const { totalExpected: churchExpectedLastMonth } = getExpectedUpToDate(church.created_at, endOfLastMonth)
      const { totalExpected: churchExpectedLastYear } = getExpectedUpToDate(church.created_at, endOfLastYear)

      totalExpectedAnnual += expectedAnnual
      totalExpectedMonthly += expectedMonthly
      totalExpected += churchExpectedToday

      const churchExpectedThisYear = Math.max(0, churchExpectedToday - churchExpectedLastYear)
      totalExpectedThisYear += churchExpectedThisYear

      const churchExpectedThisMonth = Math.max(0, churchExpectedToday - churchExpectedLastMonth)

      let churchTotalPaid = 0
      let churchPaidLastMonth = 0

      church.payments.forEach((p) => {
        const amount = Number(p.amount_paid)
        const pDate = new Date(p.payment_date)
        churchTotalPaid += amount

        // READ FROM ALLOCATIONS
        if (p.allocations.length === 0) {
          if (p.payment_type === 'Annual') totalCollectedAnnual += amount
          else totalCollectedMonthly += amount
          if (pDate >= startOfMonth) {
            if (p.payment_type === 'Annual') thisMonthCollectedAnnual += amount
            else thisMonthCollectedMonthly += amount
          }
        } else {
          p.allocations.forEach((a) => {
            const allocAmount = Number(a.amount)
            if (a.allocation_type === 'Annual') {
              totalCollectedAnnual += allocAmount
              if (pDate >= startOfMonth) thisMonthCollectedAnnual += allocAmount
            } else {
              totalCollectedMonthly += allocAmount
              if (pDate >= startOfMonth) thisMonthCollectedMonthly += allocAmount
            }
          })
        }

        if (pDate.getFullYear() === currentYear) totalCollectedThisYear += amount
        if (pDate >= startOfMonth) thisMonthTransactionCount++
        if (pDate < startOfMonth) churchPaidLastMonth += amount

        if (pDate.getMonth() === today.getMonth() && pDate.getFullYear() === today.getFullYear()) {
          const pMonthName = monthNames[pDate.getMonth()]
          if (monthlyMap[pMonthName] !== undefined) monthlyMap[pMonthName] += amount
        }

        if (p.payment_method === 'M_Pesa') mpesaCount++
        else if (p.payment_method === 'Bank_Transfer') bankCount++
        else if (p.payment_method === 'Cash') cashCount++
      })

      totalCollected += churchTotalPaid

      const arrearsBroughtForward = Math.max(0, churchExpectedLastMonth - churchPaidLastMonth)
      thisMonthExpected += churchExpectedThisMonth + arrearsBroughtForward

      const churchStatus = getPeriodStatus(churchTotalPaid, churchExpectedToday)
      if (churchStatus === 'Paid') compliantChurches++
      else if (churchStatus === 'Partial') partialChurches++
      else overdueChurches++
    })

    const outstanding = Math.max(0, totalExpected - totalCollected)
    const outstandingAnnual = Math.max(0, totalExpectedAnnual - totalCollectedAnnual)
    const outstandingMonthly = Math.max(0, totalExpectedMonthly - totalCollectedMonthly)
    const collectionPct = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0
    const compliancePct = totalChurches > 0 ? (compliantChurches / totalChurches) * 100 : 0

    const thisMonthCollections = thisMonthCollectedAnnual + thisMonthCollectedMonthly
    const thisMonthCollectionPct = thisMonthExpected > 0 ? (thisMonthCollections / thisMonthExpected) * 100 : 0

    const monthlyCollections = Object.keys(monthlyMap).map((month) => ({
      name: month,
      amount: monthlyMap[month],
    }))

    return {
      targetAmount: 17600000,
      totalCollectedThisYear,
      totalExpectedThisYear,
      recentTransactions,
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
      compliancePct,
      compliantChurches,
      partialChurches,
      overdueChurches,
      totalChurches,
      totalRegions,
      thisMonthCollectedAnnual,
      thisMonthCollectedMonthly,
      thisMonthCollections,
      thisMonthExpected,
      thisMonthCollectionPct,
      thisMonthTransactionCount,
      paymentMethods: { mpesa: mpesaCount, bank: bankCount, cash: cashCount },
      monthlyCollections,
    }
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error)
    return {
      targetAmount: 17600000, totalCollectedThisYear: 0, totalExpectedThisYear: 0, recentTransactions: [],
      totalCollected: 0, totalCollectedAnnual: 0, totalCollectedMonthly: 0,
      totalExpected: 0, totalExpectedAnnual: 0, totalExpectedMonthly: 0,
      outstanding: 0, outstandingAnnual: 0, outstandingMonthly: 0,
      collectionPct: 0, compliancePct: 0, compliantChurches: 0,
      partialChurches: 0, overdueChurches: 0, totalChurches: 0, totalRegions: 0,
      thisMonthCollectedAnnual: 0, thisMonthCollectedMonthly: 0,
      thisMonthCollections: 0, thisMonthExpected: 0, thisMonthCollectionPct: 0,
      thisMonthTransactionCount: 0, paymentMethods: { mpesa: 0, bank: 0, cash: 0 },
      monthlyCollections: [],
    }
  }
}