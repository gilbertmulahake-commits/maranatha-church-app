'use server'

import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { getExpectedUpToDate } from '@/lib/utils/financial'

export type ArrearsRow = {
  id: string
  church_code: string
  church_name: string
  region_name: string
  contact_phone: string // <-- ADDED
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

    let whereClause: any = {}
    if (dbUser?.role === 'REGIONAL_CHAIRMAN' || dbUser?.role === 'REGIONAL_TREASURER') {
      whereClause = { region_id: dbUser.region_id }
    } else if (dbUser?.role === 'LOCAL_PASTOR' || dbUser?.role === 'CHURCH_TREASURER') {
      whereClause = { id: dbUser.church_id } // Strictly their own church
    }

    const churches = await prisma.church.findMany({
      where: whereClause,
      include: {
        region: true,
        payments: { 
          where: { status: 'Paid' },
          include: { allocations: true }
        },
      },
      orderBy: { church_code: 'asc' },
    })

    const now = new Date()
    const arrearsData: ArrearsRow[] = []

    churches.forEach((church) => {
      let annualPaid = 0
      let monthlyPaid = 0

      church.payments.forEach((p) => {
        if (p.allocations.length === 0) {
          const amount = Number(p.amount_paid)
          if (p.payment_type === 'Annual') annualPaid += amount
          else monthlyPaid += amount
        } else {
          p.allocations.forEach((a) => {
            const amount = Number(a.amount)
            if (a.allocation_type === 'Annual') annualPaid += amount
            else monthlyPaid += amount
          })
        }
      })

      const { expectedAnnual, expectedMonthly } = getExpectedUpToDate(church.created_at, now)

      const annualOutstanding = Math.max(0, expectedAnnual - annualPaid)
      const monthlyOutstanding = Math.max(0, expectedMonthly - monthlyPaid)
      const totalOutstanding = annualOutstanding + monthlyOutstanding

      if (totalOutstanding > 0) {
        arrearsData.push({
          id: church.id,
          church_code: church.church_code,
          church_name: church.church_name,
          region_name: church.region.name,
          contact_phone: church.contact_phone, // <-- ADDED
          annualOutstanding,
          monthlyOutstanding,
          totalOutstanding,
        })
      }
    })

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

    const startOfDay = new Date(targetDate)
    startOfDay.setHours(0, 0, 0, 0)
    
    const endOfDay = new Date(targetDate)
    endOfDay.setHours(23, 59, 59, 999)

    let whereClause: any = {
      payment_date: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: 'Paid',
    }

    if (dbUser?.role === 'REGIONAL_CHAIRMAN' || dbUser?.role === 'REGIONAL_TREASURER') {
      whereClause.church = { region_id: dbUser.region_id }
    } else if (dbUser?.role === 'LOCAL_PASTOR' || dbUser?.role === 'CHURCH_TREASURER') {
      whereClause.church_id = dbUser.church_id // Strictly their own church
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