'use server'

import { prisma } from '@/lib/prisma'
import { getExpectedToDate, getChurchStatus, ANNUAL_FEE, MONTHLY_FEE } from '@/lib/utils/financial'

export async function getDashboardStats() {
  try {
    // 1. Fetch all churches with their payments
    const churches = await prisma.church.findMany({
      include: {
        payments: {
          where: { status: 'Paid' },
        },
      },
    })

    const totalChurches = churches.length
    const totalRegions = await prisma.region.count()

    // 2. Calculate Expected Targets
    const totalExpectedAnnual = totalChurches * ANNUAL_FEE
    const totalExpectedMonthly = totalChurches * (MONTHLY_FEE * 12)
    const totalExpected = totalExpectedAnnual + totalExpectedMonthly // The 17.6M target

    // 3. Calculate Expected to Date (Based on current month)
    const { totalExpected: expectedToDate } = getExpectedToDate()
    const totalExpectedToDateAllChurches = expectedToDate * totalChurches

    // 4. Calculate Actuals
    let totalCollected = 0
    let totalCollectedAnnual = 0
    let totalCollectedMonthly = 0
    let compliantChurches = 0

    // Payment method counts
    let mpesaCount = 0
    let bankCount = 0
    let cashCount = 0

    churches.forEach((church) => {
      let churchTotalPaid = 0

      church.payments.forEach((payment) => {
        churchTotalPaid += Number(payment.amount_paid)

        if (payment.payment_type === 'Annual') {
          totalCollectedAnnual += Number(payment.amount_paid)
        } else {
          totalCollectedMonthly += Number(payment.amount_paid)
        }

        // Count payment methods for the pie chart
        if (payment.payment_method === 'M_Pesa') mpesaCount++
        else if (payment.payment_method === 'Bank_Transfer') bankCount++
        else if (payment.payment_method === 'Cash') cashCount++
      })

      totalCollected += churchTotalPaid

      // Determine if this specific church is compliant
      const status = getChurchStatus(churchTotalPaid, expectedToDate)
      if (status === 'Paid') {
        compliantChurches++
      }
    })

    const outstanding = totalExpected - totalCollected
    const collectionPct = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0
    const compliancePct = totalChurches > 0 ? (compliantChurches / totalChurches) * 100 : 0

    return {
      totalCollected,
      totalCollectedAnnual,
      totalCollectedMonthly,
      totalExpected,
      totalExpectedAnnual,
      totalExpectedMonthly,
      outstanding,
      collectionPct,
      compliancePct,
      totalChurches,
      totalRegions,
      paymentMethods: {
        mpesa: mpesaCount,
        bank: bankCount,
        cash: cashCount,
      },
    }
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error)
    return {
      totalCollected: 0,
      totalCollectedAnnual: 0,
      totalCollectedMonthly: 0,
      totalExpected: 17600000,
      totalExpectedAnnual: 8000000,
      totalExpectedMonthly: 9600000,
      outstanding: 17600000,
      collectionPct: 0,
      compliancePct: 0,
      totalChurches: 0,
      totalRegions: 0,
      paymentMethods: { mpesa: 0, bank: 0, cash: 0 },
    }
  }
}