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
    
    // Include allocations to detect 'Mixed' payments
    const recentTransactionsRaw = await prisma.payment.findMany({
      take: 5,
      orderBy: { payment_date: 'desc' },
      include: { church: true, allocations: true },
      where: { status: 'Paid' }
    })

    const recentTransactions = recentTransactionsRaw.map(p => {
      const hasAnnual = p.allocations.some(a => a.allocation_type === 'Annual')
      const hasMonthly = p.allocations.some(a => a.allocation_type === 'Monthly')
      const isMixed = hasAnnual && hasMonthly

      return {
        id: p.id,
        transaction_id: p.transaction_id,
        church_name: p.church.church_name,
        church_code: p.church.church_code,
        amount_paid: Number(p.amount_paid),
        payment_type: isMixed ? 'Mixed' : p.payment_type,
        payment_method: p.payment_method,
        payment_date: p.payment_date.toISOString(),
        is_mixed: isMixed,
      }
    })

    const today = new Date()
    const currentYear = today.getFullYear()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const endOfLastMonth = new Date(startOfMonth.getTime() - 1)
    const endOfLastYear = new Date(currentYear - 1, 11, 31, 23, 59, 59, 999)
    
    // Arrears aging calculation dates
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(today.getDate() - 30)
    
    const sixtyDaysAgo = new Date(today)
    sixtyDaysAgo.setDate(today.getDate() - 60)
    
    const ninetyDaysAgo = new Date(today)
    ninetyDaysAgo.setDate(today.getDate() - 90)
    
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(today.getDate() - 7)

    let totalCollected = 0
    let totalCollectedAnnual = 0
    let totalCollectedMonthly = 0
    let totalExpected = 0
    let totalExpectedAnnual = 0
    let totalExpectedMonthly = 0

    let grossOutstandingAnnual = 0
    let grossOutstandingMonthly = 0

    let totalCollectedThisYear = 0
    let totalExpectedThisYear = 0
    let totalCollectedThisWeek = 0

    let thisMonthCollectedAnnual = 0
    let thisMonthCollectedMonthly = 0
    let thisMonthExpected = 0
    let thisMonthTransactionCount = 0

    let compliantChurches = 0
    let partialChurches = 0
    let overdueChurches = 0
    let naChurches = 0

    let mpesaCount = 0
    let bankCount = 0
    let cashCount = 0

    // Arrears Aging Buckets
    let aging0_30 = 0
    let aging31_60 = 0
    let aging61_90 = 0
    let aging90_plus = 0

    const monthlyMap: Record<string, number> = {}
    const yearlyMap: Record<string, number> = {}
    const weekMap: Record<string, number> = { 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0, 'Sun': 0 }
    const allTimeMap: Record<string, number> = {}
    const paymentTypeCounts = { Annual: 0, Monthly: 0, Mixed: 0 }
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      monthlyMap[monthNames[d.getMonth()]] = 0
    }
    
    for (let i = 0; i < 12; i++) {
      yearlyMap[monthNames[i]] = 0
    }

    churches.forEach((church) => {
      const { expectedAnnual, expectedMonthly, totalExpected: churchExpectedToday } = getExpectedUpToDate(church.created_at, today)
      const { totalExpected: churchExpectedLastMonth } = getExpectedUpToDate(church.created_at, endOfLastMonth)
      const { totalExpected: churchExpectedLastYear } = getExpectedUpToDate(church.created_at, endOfLastYear)
      
      // Aging expected calculations
      const { totalExpected: exp30 } = getExpectedUpToDate(church.created_at, thirtyDaysAgo)
      const { totalExpected: exp60 } = getExpectedUpToDate(church.created_at, sixtyDaysAgo)
      const { totalExpected: exp90 } = getExpectedUpToDate(church.created_at, ninetyDaysAgo)

      totalExpectedAnnual += expectedAnnual
      totalExpectedMonthly += expectedMonthly
      totalExpected += churchExpectedToday

      const churchExpectedThisYear = Math.max(0, churchExpectedToday - churchExpectedLastYear)
      totalExpectedThisYear += churchExpectedThisYear

      const churchExpectedThisMonth = Math.max(0, churchExpectedToday - churchExpectedLastMonth)

      let churchTotalPaid = 0
      let churchAnnualPaid = 0
      let churchMonthlyPaid = 0
      let churchPaidLastMonth = 0
      
      // Aging paid calculations
      let paid30 = 0
      let paid60 = 0
      let paid90 = 0

      church.payments.forEach((p) => {
        const amount = Number(p.amount_paid)
        const pDate = new Date(p.payment_date)
        churchTotalPaid += amount

        if (pDate <= thirtyDaysAgo) paid30 += amount
        if (pDate <= sixtyDaysAgo) paid60 += amount
        if (pDate <= ninetyDaysAgo) paid90 += amount

        if (p.allocations.length === 0) {
          if (p.payment_type === 'Annual') {
            totalCollectedAnnual += amount
            churchAnnualPaid += amount
            if (pDate >= startOfMonth) thisMonthCollectedAnnual += amount
          } else {
            totalCollectedMonthly += amount
            churchMonthlyPaid += amount
            if (pDate >= startOfMonth) thisMonthCollectedMonthly += amount
          }
        } else {
          p.allocations.forEach((a) => {
            const allocAmount = Number(a.amount)
            if (a.allocation_type === 'Annual') {
              totalCollectedAnnual += allocAmount
              churchAnnualPaid += allocAmount
              if (pDate >= startOfMonth) thisMonthCollectedAnnual += allocAmount
            } else {
              totalCollectedMonthly += allocAmount
              churchMonthlyPaid += allocAmount
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

        if (pDate.getFullYear() === currentYear) {
          yearlyMap[monthNames[pDate.getMonth()]] += amount
        }

        if (pDate >= sevenDaysAgo) {
          weekMap[dayNames[pDate.getDay()]] += amount
          totalCollectedThisWeek += amount
        }

        const monthKey = `${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(2, '0')}`
        allTimeMap[monthKey] = (allTimeMap[monthKey] || 0) + amount

        const hasAnnual = p.allocations.some(a => a.allocation_type === 'Annual')
        const hasMonthly = p.allocations.some(a => a.allocation_type === 'Monthly')
        const isMixed = hasAnnual && hasMonthly
        
        if (isMixed) paymentTypeCounts.Mixed++
        else if (p.payment_type === 'Annual') paymentTypeCounts.Annual++
        else paymentTypeCounts.Monthly++

        if (p.payment_method === 'M_Pesa') mpesaCount++
        else if (p.payment_method === 'Bank_Transfer') bankCount++
        else if (p.payment_method === 'Cash') cashCount++
      })

      totalCollected += churchTotalPaid

      grossOutstandingAnnual += Math.max(0, expectedAnnual - churchAnnualPaid)
      grossOutstandingMonthly += Math.max(0, expectedMonthly - churchMonthlyPaid)

      // Calculate Arrears Aging Buckets
      const unpaidToday = Math.max(0, churchExpectedToday - churchTotalPaid)
      const unpaid30 = Math.max(0, exp30 - paid30)
      const unpaid60 = Math.max(0, exp60 - paid60)
      const unpaid90 = Math.max(0, exp90 - paid90)

      const bucket90plus = unpaid90
      const bucket61to90 = Math.max(0, unpaid60 - unpaid90)
      const bucket31to60 = Math.max(0, unpaid30 - unpaid60)
      const bucket0to30 = Math.max(0, unpaidToday - unpaid30)

      aging90_plus += bucket90plus
      aging61_90 += bucket61to90
      aging31_60 += bucket31to60
      aging0_30 += bucket0to30

      const arrearsBroughtForward = Math.max(0, churchExpectedLastMonth - churchPaidLastMonth)
      thisMonthExpected += churchExpectedThisMonth + arrearsBroughtForward

      const annualStatus = getPeriodStatus(churchAnnualPaid, expectedAnnual)
      const monthlyStatus = getPeriodStatus(churchMonthlyPaid, expectedMonthly)
      
      let overallStatus = 'Partial'
      if (annualStatus === 'Paid' && monthlyStatus === 'Paid') overallStatus = 'Paid'
      else if (annualStatus === 'Overdue' && monthlyStatus === 'Overdue') overallStatus = 'Overdue'
      else if (expectedAnnual === 0 && churchAnnualPaid === 0 && expectedMonthly === 0 && churchMonthlyPaid === 0) overallStatus = 'N/A'

      if (overallStatus === 'Paid') compliantChurches++
      else if (overallStatus === 'Partial') partialChurches++
      else if (overallStatus === 'Overdue') overdueChurches++
      else naChurches++
    })

    const grossOutstanding = grossOutstandingAnnual + grossOutstandingMonthly

    const collectionPct = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0
    const compliancePct = totalChurches > 0 ? (compliantChurches / totalChurches) * 100 : 0

    const thisMonthCollections = thisMonthCollectedAnnual + thisMonthCollectedMonthly
    const thisMonthCollectionPct = thisMonthExpected > 0 ? (thisMonthCollections / thisMonthExpected) * 100 : 0

    const monthlyCollections = Object.keys(monthlyMap).map((month) => ({
      name: month,
      amount: monthlyMap[month],
    }))

    const weeklyCollections = [
      { name: 'Mon', amount: weekMap['Mon'] },
      { name: 'Tue', amount: weekMap['Tue'] },
      { name: 'Wed', amount: weekMap['Wed'] },
      { name: 'Thu', amount: weekMap['Thu'] },
      { name: 'Fri', amount: weekMap['Fri'] },
      { name: 'Sat', amount: weekMap['Sat'] },
      { name: 'Sun', amount: weekMap['Sun'] },
    ]

    const yearlyCollections = Object.keys(yearlyMap).map((month) => ({
      name: month,
      amount: yearlyMap[month],
    }))

    const allTimeCollections = Object.keys(allTimeMap)
      .sort()
      .map((key) => {
        const [year, month] = key.split('-')
        return {
          name: `${monthNames[parseInt(month) - 1]} ${year.slice(-2)}`,
          amount: allTimeMap[key],
        }
      })

    const targetAmount = totalChurches * 11000

    return {
      targetAmount,
      totalCollectedThisYear,
      totalExpectedThisYear,
      totalCollectedThisWeek,
      recentTransactions,
      totalCollected,
      totalCollectedAnnual,
      totalCollectedMonthly,
      totalExpected,
      totalExpectedAnnual,
      totalExpectedMonthly,
      outstanding: grossOutstanding,
      outstandingAnnual: grossOutstandingAnnual,
      outstandingMonthly: grossOutstandingMonthly,
      collectionPct,
      compliancePct,
      compliantChurches,
      partialChurches,
      overdueChurches,
      naChurches,
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
      weeklyCollections,
      yearlyCollections,
      allTimeCollections,
      paymentTypeCounts,
      // New Arrears Aging Buckets
      aging0_30,
      aging31_60,
      aging61_90,
      aging90_plus,
    }
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error)
    return {
      targetAmount: 0, totalCollectedThisYear: 0, totalExpectedThisYear: 0, totalCollectedThisWeek: 0, recentTransactions: [],
      totalCollected: 0, totalCollectedAnnual: 0, totalCollectedMonthly: 0,
      totalExpected: 0, totalExpectedAnnual: 0, totalExpectedMonthly: 0,
      outstanding: 0, outstandingAnnual: 0, outstandingMonthly: 0,
      collectionPct: 0, compliancePct: 0, compliantChurches: 0,
      partialChurches: 0, overdueChurches: 0, naChurches: 0, totalChurches: 0, totalRegions: 0,
      thisMonthCollectedAnnual: 0, thisMonthCollectedMonthly: 0,
      thisMonthCollections: 0, thisMonthExpected: 0, thisMonthCollectionPct: 0,
      thisMonthTransactionCount: 0, paymentMethods: { mpesa: 0, bank: 0, cash: 0 },
      monthlyCollections: [],
      weeklyCollections: [],
      yearlyCollections: [],
      allTimeCollections: [],
      paymentTypeCounts: { Annual: 0, Monthly: 0, Mixed: 0 },
      aging0_30: 0,
      aging31_60: 0,
      aging61_90: 0,
      aging90_plus: 0,
    }
  }
}