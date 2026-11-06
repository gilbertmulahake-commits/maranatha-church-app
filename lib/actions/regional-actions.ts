'use server'

import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { getExpectedToDate, getChurchStatus, ANNUAL_FEE, MONTHLY_FEE } from '@/lib/utils/financial'

export type RegionalChurchData = {
  id: string
  church_code: string
  church_name: string
  pastor_name: string
  pastor_phone: string
  treasurer_name: string
  contact_phone: string
  status: 'Paid' | 'Partial' | 'Overdue'
  amountPaid: number
  outstanding: number
}

export type RegionalStatsSuccess = {
  regionName: string
  chairmanName: string
  totalCollected: number
  totalCollectedAnnual: number
  totalCollectedMonthly: number
  totalExpectedAnnual: number
  totalExpectedMonthly: number
  outstanding: number
  outstandingAnnual: number    // NEW
  outstandingMonthly: number   // NEW
  compliancePct: number
  compliantChurches: number    // NEW
  partialChurches: number      // NEW
  overdueChurches: number      // NEW
  churches: RegionalChurchData[]
}

export type RegionalStatsError = {
  error: string
}

export async function getRegionalStats(): Promise<RegionalStatsSuccess | RegionalStatsError> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Not authenticated' }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    })

    if (!dbUser || !['REGIONAL_CHAIRMAN', 'REGIONAL_TREASURER'].includes(dbUser.role) || !dbUser.region_id) {
      return { error: 'User is not a Regional role or has no assigned region.' }
    }

    const region = await prisma.region.findUnique({
      where: { id: dbUser.region_id },
      include: {
        churches: {
          include: {
            payments: true,
          },
        },
      },
    })

    if (!region) return { error: 'Region not found' }

    const totalChurches = region.churches.length
    const totalExpectedAnnual = totalChurches * ANNUAL_FEE
    const totalExpectedMonthly = totalChurches * (MONTHLY_FEE * 12)
    const totalExpected = totalExpectedAnnual + totalExpectedMonthly

    const { totalExpected: expectedToDate } = getExpectedToDate()

    let totalCollected = 0
    let totalCollectedAnnual = 0
    let totalCollectedMonthly = 0
    let compliantChurches = 0
    let partialChurches = 0
    let overdueChurches = 0

    const churchesData: RegionalChurchData[] = region.churches.map((church) => {
      let churchTotalPaid = 0
      let churchPaidAnnual = 0
      let churchPaidMonthly = 0

      church.payments.forEach((payment) => {
        const amount = Number(payment.amount_paid)
        churchTotalPaid += amount
        if (payment.payment_type === 'Annual') {
          totalCollectedAnnual += amount
          churchPaidAnnual += amount
        } else {
          totalCollectedMonthly += amount
          churchPaidMonthly += amount
        }
      })

      totalCollected += churchTotalPaid

      const status = getChurchStatus(churchTotalPaid, expectedToDate)
      if (status === 'Paid') compliantChurches++
      else if (status === 'Partial') partialChurches++
      else overdueChurches++

      return {
        id: church.id,
        church_code: church.church_code,
        church_name: church.church_name,
        pastor_name: church.pastor_name,
        pastor_phone: church.pastor_phone,
        treasurer_name: church.treasurer_name,
        contact_phone: church.contact_phone,
        status: status,
        amountPaid: churchTotalPaid,
        // Outstanding per church is calculated against expected-to-date for the table
        outstanding: Math.max(0, expectedToDate - churchTotalPaid), 
      }
    })

    const outstanding = totalExpected - totalCollected
    const outstandingAnnual = totalExpectedAnnual - totalCollectedAnnual
    const outstandingMonthly = totalExpectedMonthly - totalCollectedMonthly
    const compliancePct = totalChurches > 0 ? (compliantChurches / totalChurches) * 100 : 0

    return {
      regionName: region.name,
      chairmanName: region.chairman_name,
      totalCollected,
      totalCollectedAnnual,
      totalCollectedMonthly,
      totalExpectedAnnual,
      totalExpectedMonthly,
      outstanding,
      outstandingAnnual,
      outstandingMonthly,
      compliancePct,
      compliantChurches,
      partialChurches,
      overdueChurches,
      churches: churchesData,
    }
  } catch (error) {
    console.error('Failed to fetch regional stats:', error)
    return { error: 'Internal Server Error' }
  }
}