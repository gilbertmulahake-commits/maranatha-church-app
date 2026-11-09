'use server'

import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export type PaymentRow = {
  id: string
  transaction_id: string
  church_code: string
  church_name: string
  amount_paid: number
  payment_type: 'Monthly' | 'Annual'
  payment_method: string
  payment_date: string
  status: string
  is_mixed: boolean
}

export async function getPayments(): Promise<{ 
  payments: PaymentRow[], 
  stats: { 
    totalTransactions: number
    totalVolume: number
    annualVolume: number
    monthlyVolume: number
    thisMonthVolume: number
    mpesaCount: number
    bankCount: number
    cashCount: number
  } 
}> {
  const emptyState = { 
    payments: [], 
    stats: { 
      totalTransactions: 0, 
      totalVolume: 0, 
      annualVolume: 0, 
      monthlyVolume: 0, 
      thisMonthVolume: 0, 
      mpesaCount: 0, 
      bankCount: 0, 
      cashCount: 0 
    } 
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return emptyState

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })

    // 1. Enforce Regional Isolation
    let whereClause = {}
    if (dbUser?.role === 'REGIONAL_CHAIRMAN' || dbUser?.role === 'REGIONAL_TREASURER') {
      whereClause = {
        church: { region_id: dbUser.region_id }
      }
    }

    const payments = await prisma.payment.findMany({
      where: whereClause,
      include: {
        church: true,
        allocations: true,
      },
      orderBy: { payment_date: 'desc' },
    })

    // 2. Calculate Stats
    let totalVolume = 0
    let annualVolume = 0
    let monthlyVolume = 0
    let mpesaCount = 0
    let bankCount = 0
    let cashCount = 0

    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    let thisMonthVolume = 0

    const formattedPayments: PaymentRow[] = payments.map((p) => {
      const amount = Number(p.amount_paid)
      totalVolume += amount

      // READ FROM ALLOCATIONS
      let isMixed = false
      if (p.allocations.length === 0) {
        if (p.payment_type === 'Annual') annualVolume += amount
        else monthlyVolume += amount
      } else {
        const uniqueTypes = new Set(p.allocations.map(a => a.allocation_type))
        if (uniqueTypes.size > 1) isMixed = true

        p.allocations.forEach((a) => {
          const allocAmount = Number(a.amount)
          if (a.allocation_type === 'Annual') annualVolume += allocAmount
          else monthlyVolume += allocAmount
        })
      }

      if (p.payment_method === 'M_Pesa') mpesaCount++
      else if (p.payment_method === 'Bank_Transfer') bankCount++
      else if (p.payment_method === 'Cash') cashCount++

      if (new Date(p.payment_date) >= startOfMonth) {
        thisMonthVolume += amount
      }

      return {
        id: p.id,
        transaction_id: p.transaction_id,
        church_code: p.church.church_code,
        church_name: p.church.church_name,
        amount_paid: amount,
        payment_type: p.payment_type as 'Monthly' | 'Annual',
        payment_method: p.payment_method,
        payment_date: p.payment_date.toISOString(),
        status: p.status,
        is_mixed: isMixed,
      }
    })

    return {
      payments: formattedPayments,
      stats: {
        totalTransactions: payments.length,
        totalVolume,
        annualVolume,
        monthlyVolume,
        thisMonthVolume,
        mpesaCount,
        bankCount,
        cashCount
      }
    }

  } catch (error) {
    console.error('Failed to fetch payments:', error)
    return emptyState
  }
}