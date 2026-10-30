'use server'

import { prisma } from '@/lib/prisma'

export async function getDashboardStats() {
  try {
    // 1. Total collected (sum of all payments)
    const collectedResult = await prisma.payment.aggregate({
      _sum: { amount_paid: true },
      where: { status: 'Paid' },
    })
    const totalCollected = Number(collectedResult._sum.amount_paid ?? 0)

    // 2. Total expected (fixed target)
    const totalExpected = 17600000

    // 3. Outstanding (Arrears)
    const outstanding = totalExpected - totalCollected

    // 4. Collection Percentage
    const collectionPct = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0

    // 5. Counts
    const totalChurches = await prisma.church.count()
    const totalRegions = await prisma.region.count()

    // 6. Payment Methods Distribution (for Pie Chart)
    const mpesaCount = await prisma.payment.count({ where: { payment_method: 'M_Pesa' } })
    const bankCount = await prisma.payment.count({ where: { payment_method: 'Bank_Transfer' } })
    const cashCount = await prisma.payment.count({ where: { payment_method: 'Cash' } })

    return {
      totalCollected,
      totalExpected,
      outstanding,
      collectionPct,
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
      totalExpected: 17600000,
      outstanding: 17600000,
      collectionPct: 0,
      totalChurches: 0,
      totalRegions: 0,
      paymentMethods: { mpesa: 0, bank: 0, cash: 0 },
    }
  }
}