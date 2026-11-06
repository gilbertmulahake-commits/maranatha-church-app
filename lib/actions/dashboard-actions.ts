'use server'

import { prisma } from '@/lib/prisma'
import { getExpectedToDate, getChurchStatus, ANNUAL_FEE, MONTHLY_FEE } from '@/lib/utils/financial'

export async function getDashboardStats() {
  try {
    const churches = await prisma.church.findMany({
      include: {
        payments: { where: { status: 'Paid' } },
      },
    })

    const totalChurches = churches.length
    const totalRegions = await prisma.region.count()

    const totalExpectedAnnual = totalChurches * ANNUAL_FEE
    const totalExpectedMonthly = totalChurches * (MONTHLY_FEE * 12)
    const totalExpected = totalExpectedAnnual + totalExpectedMonthly

    const { totalExpected: expectedToDate } = getExpectedToDate()

    let totalCollected = 0
    let totalCollectedAnnual = 0
    let totalCollectedMonthly = 0
    let thisMonthCollections = 0
    let thisMonthTransactionCount = 0
    let compliantChurches = 0
    let partialChurches = 0
    let overdueChurches = 0

    let mpesaCount = 0
    let bankCount = 0
    let cashCount = 0

    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()

    const monthlyMap: Record<string, number> = {}
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      monthlyMap[monthNames[d.getMonth()]] = 0
    }

    churches.forEach((church) => {
      let churchTotalPaid = 0

      church.payments.forEach((payment) => {
        const amount = Number(payment.amount_paid)
        churchTotalPaid += amount

        if (payment.payment_type === 'Annual') totalCollectedAnnual += amount
        else totalCollectedMonthly += amount

        const pDate = new Date(payment.payment_date)
        if (pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear) {
          thisMonthCollections += amount
          thisMonthTransactionCount++
        }

        const pMonthName = monthNames[pDate.getMonth()]
        if (monthlyMap[pMonthName] !== undefined) {
          monthlyMap[pMonthName] += amount
        }

        if (payment.payment_method === 'M_Pesa') mpesaCount++
        else if (payment.payment_method === 'Bank_Transfer') bankCount++
        else if (payment.payment_method === 'Cash') cashCount++
      })

      totalCollected += churchTotalPaid

      const status = getChurchStatus(churchTotalPaid, expectedToDate)
      if (status === 'Paid') compliantChurches++
      else if (status === 'Partial') partialChurches++
      else overdueChurches++
    })

    const outstanding = totalExpected - totalCollected
    const outstandingAnnual = totalExpectedAnnual - totalCollectedAnnual
    const outstandingMonthly = totalExpectedMonthly - totalCollectedMonthly
    const collectionPct = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0
    const compliancePct = totalChurches > 0 ? (compliantChurches / totalChurches) * 100 : 0

    const monthlyCollections = Object.keys(monthlyMap).map(month => ({
      name: month,
      amount: monthlyMap[month]
    }))

    return {
      totalCollected,
      totalCollectedAnnual,
      totalCollectedMonthly,
      thisMonthCollections,
      thisMonthTransactionCount,
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
      paymentMethods: { mpesa: mpesaCount, bank: bankCount, cash: cashCount },
      monthlyCollections,
    }
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error)
    return {
      totalCollected: 0, totalCollectedAnnual: 0, totalCollectedMonthly: 0,
      thisMonthCollections: 0, thisMonthTransactionCount: 0,
      totalExpected: 17600000, totalExpectedAnnual: 8000000, totalExpectedMonthly: 9600000,
      outstanding: 17600000, outstandingAnnual: 8000000, outstandingMonthly: 9600000,
      collectionPct: 0, compliancePct: 0,
      compliantChurches: 0, partialChurches: 0, overdueChurches: 0,
      totalChurches: 0, totalRegions: 0,
      paymentMethods: { mpesa: 0, bank: 0, cash: 0 },
      monthlyCollections: [],
    }
  }
}