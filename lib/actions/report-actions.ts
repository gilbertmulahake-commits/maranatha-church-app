'use server'

import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { getExpectedUpToDate } from '@/lib/utils/financial'

export type ArrearsRow = {
  id: string
  church_code: string
  church_name: string
  region_name: string
  annualOutstanding: number
  monthlyOutstanding: number
  totalOutstanding: number
}

export type CashbookRow = {
  id: string
  transaction_id: string
  church_code: string
  church_name: string
  amount_paid: number
  payment_type: string
  payment_method: string
  payment_date: string
}

export async function getArrearsReport(): Promise<ArrearsRow[]> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })

    // Enforce Regional Isolation
    let whereClause = {}
    if (dbUser?.role === 'REGIONAL_CHAIRMAN' || dbUser?.role === 'REGIONAL_TREASURER') {
      whereClause = { region_id: dbUser.region_id }
    }

    const churches = await prisma.church.findMany({
      where: whereClause,
      include: {
        region: true,
        payments: { where: { status: 'Paid' } },
      },
      orderBy: { church_code: 'asc' },
    })

    const now = new Date()
    const arrearsData: ArrearsRow[] = []

    churches.forEach((church) => {
      let annualPaid = 0
      let monthlyPaid = 0

      church.payments.forEach((p) => {
        const amount = Number(p.amount_paid)
        if (p.payment_type === 'Annual') annualPaid += amount
        else monthlyPaid += amount
      })

      const { expectedAnnual, expectedMonthly } = getExpectedUpToDate(church.created_at, now)

      // Strict Bucket Isolation: Calculate outstanding separately
      const annualOutstanding = Math.max(0, expectedAnnual - annualPaid)
      const monthlyOutstanding = Math.max(0, expectedMonthly - monthlyPaid)
      const totalOutstanding = annualOutstanding + monthlyOutstanding

      // Only include churches that actually owe money
      if (totalOutstanding > 0) {
        arrearsData.push({
          id: church.id,
          church_code: church.church_code,
          church_name: church.church_name,
          region_name: church.region.name,
          annualOutstanding,
          monthlyOutstanding,
          totalOutstanding,
        })
      }
    })

    // Sort by highest total outstanding first
    return arrearsData.sort((a, b) => b.totalOutstanding - a.totalOutstanding)

  } catch (error) {
    console.error('Failed to fetch arrears report:', error)
    return []
  }
}

export async function getDailyCashbook(targetDate: Date): Promise<CashbookRow[]> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })

    // Date boundaries for the requested day (00:00:00 to 23:59:59)
    const startOfDay = new Date(targetDate)
    startOfDay.setHours(0, 0, 0, 0)
    
    const endOfDay = new Date(targetDate)
    endOfDay.setHours(23, 59, 59, 999)

    // Enforce Regional Isolation
    let whereClause: any = {
      payment_date: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: 'Paid',
    }

    if (dbUser?.role === 'REGIONAL_CHAIRMAN' || dbUser?.role === 'REGIONAL_TREASURER') {
      whereClause.church = { region_id: dbUser.region_id }
    }

    const payments = await prisma.payment.findMany({
      where: whereClause,
      include: { church: true },
      orderBy: { payment_date: 'asc' },
    })

    return payments.map((p) => ({
      id: p.id,
      transaction_id: p.transaction_id,
      church_code: p.church.church_code,
      church_name: p.church.church_name,
      amount_paid: Number(p.amount_paid),
      payment_type: p.payment_type,
      payment_method: p.payment_method,
      payment_date: p.payment_date.toISOString(),
    }))

  } catch (error) {
    console.error('Failed to fetch daily cashbook:', error)
    return []
  }
}