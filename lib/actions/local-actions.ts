'use server'

import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { getExpectedUpToDate, getCreditBalance, getPeriodStatus } from '@/lib/utils/financial'

export type LocalChurchStats = {
  churchName: string
  churchCode: string
  regionName: string
  totalPaid: number
  annualPaid: number
  monthlyPaid: number
  annualOutstanding: number
  monthlyOutstanding: number
  annualStatus: 'Paid' | 'Partial' | 'Overdue' | 'N/A'
  monthlyStatus: 'Paid' | 'Partial' | 'Overdue'
  overallStatus: 'Paid' | 'Partial' | 'Overdue'
  payments: {
    id: string
    transaction_id: string
    amount_paid: number
    payment_type: string
    payment_date: string
    payment_method: string
  }[]
}

export async function getLocalChurchStats(): Promise<LocalChurchStats | { error: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        church: {
          include: {
            region: true,
            payments: { 
              where: { status: 'Paid' }, 
              orderBy: { payment_date: 'desc' },
              include: { allocations: true }
            }
          }
        }
      }
    })

    if (!dbUser || !dbUser.church) {
      return { error: 'No church assigned to this user.' }
    }

    const church = dbUser.church
    const now = new Date()

    let annualPaid = 0
    let monthlyPaid = 0

    // READ FROM ALLOCATIONS
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

    const totalPaid = annualPaid + monthlyPaid
    const { expectedAnnual, expectedMonthly, totalExpected } = getExpectedUpToDate(church.created_at, now)

    const annualOutstanding = Math.max(0, expectedAnnual - annualPaid)
    const monthlyOutstanding = Math.max(0, expectedMonthly - monthlyPaid)

    let annualStatus: LocalChurchStats['annualStatus'] = getPeriodStatus(annualPaid, expectedAnnual)
    if (expectedAnnual === 0 && annualPaid === 0) annualStatus = 'N/A'
    
    const monthlyStatus = getPeriodStatus(monthlyPaid, expectedMonthly)
    
    let overallStatus: 'Paid' | 'Partial' | 'Overdue' = 'Partial'
    if (annualStatus === 'Paid' && monthlyStatus === 'Paid') overallStatus = 'Paid'
    else if (annualStatus === 'Overdue' && monthlyStatus === 'Overdue') overallStatus = 'Overdue'

    return {
      churchName: church.church_name,
      churchCode: church.church_code,
      regionName: church.region.name,
      totalPaid,
      annualPaid,
      monthlyPaid,
      annualOutstanding,
      monthlyOutstanding,
      annualStatus,
      monthlyStatus,
      overallStatus,
      payments: church.payments.map((p) => ({
        id: p.id,
        transaction_id: p.transaction_id,
        amount_paid: Number(p.amount_paid),
        payment_type: p.payment_type,
        payment_date: p.payment_date.toISOString(),
        payment_method: p.payment_method,
      }))
    }

  } catch (error) {
    console.error('Failed to fetch local stats:', error)
    return { error: 'Internal Server Error' }
  }
}