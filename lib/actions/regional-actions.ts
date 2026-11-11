'use server'

import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { getExpectedUpToDate, getCreditBalance, getPeriodStatus } from '@/lib/utils/financial'

export type RegionalChurchData = {
  id: string
  church_code: string
  church_name: string
  pastor_name: string
  pastor_phone: string
  treasurer_name: string
  contact_phone: string
  status: 'Paid' | 'Partial' | 'Overdue'
  annualStatus: 'Paid' | 'Partial' | 'Overdue' | 'N/A'
  monthlyStatus: 'Paid' | 'Partial' | 'Overdue'
  amountPaid: number
  outstanding: number
  annualCredit: number
  monthlyCredit: number
  annualPaid: number
  monthlyPaid: number
  annualOutstanding: number
  monthlyOutstanding: number
}

export type RegionalStatsSuccess = {
  regionName: string
  chairmanName: string
  totalCollected: number
  totalCollectedAnnual: number
  totalCollectedMonthly: number
  totalExpectedAnnual: number
  totalExpectedMonthly: number
  totalExpected: number
  outstanding: number
  outstandingAnnual: number
  outstandingMonthly: number
  
  thisMonthCollectedAnnual: number
  thisMonthCollectedMonthly: number
  thisMonthExpected: number
  thisMonthCollectionPct: number

  compliancePct: number
  compliantChurches: number
  partialChurches: number
  overdueChurches: number
  churches: RegionalChurchData[]
}

export type RegionalStatsError = { error: string }

export async function getRegionalStats(): Promise<RegionalStatsSuccess | RegionalStatsError> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Not authenticated' }

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })

    if (!dbUser || !['REGIONAL_CHAIRMAN', 'REGIONAL_TREASURER'].includes(dbUser.role) || !dbUser.region_id) {
      return { error: 'User is not a Regional role or has no assigned region.' }
    }

    const region = await prisma.region.findUnique({
      where: { id: dbUser.region_id },
      include: { 
        churches: { 
          include: { 
            payments: { include: { allocations: true } } 
          } 
        } 
      },
    })

    if (!region) return { error: 'Region not found' }

    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const endOfLastMonth = new Date(startOfMonth.getTime() - 1)

    let totalExpectedAnnual = 0
    let totalExpectedMonthly = 0
    let totalExpected = 0
    let totalCollected = 0
    let totalCollectedAnnual = 0
    let totalCollectedMonthly = 0

    let outstanding = 0
    let outstandingAnnual = 0
    let outstandingMonthly = 0

    let thisMonthCollectedAnnual = 0
    let thisMonthCollectedMonthly = 0
    let thisMonthExpected = 0

    let compliantChurches = 0
    let partialChurches = 0
    let overdueChurches = 0

    const churchesData: RegionalChurchData[] = region.churches.map((church) => {
      let churchTotalPaid = 0
      let annualPaid = 0
      let monthlyPaid = 0
      let churchPaidLastMonth = 0

      church.payments.forEach((p) => {
        const pDate = new Date(p.payment_date)
        const amount = Number(p.amount_paid)
        churchTotalPaid += amount

        if (p.allocations.length === 0) {
          if (p.payment_type === 'Annual') {
            annualPaid += amount
            if (pDate >= startOfMonth) thisMonthCollectedAnnual += amount
          } else {
            monthlyPaid += amount
            if (pDate >= startOfMonth) thisMonthCollectedMonthly += amount
          }
        } else {
          p.allocations.forEach((a) => {
            const allocAmount = Number(a.amount)
            if (a.allocation_type === 'Annual') {
              annualPaid += allocAmount
              if (pDate >= startOfMonth) thisMonthCollectedAnnual += allocAmount
            } else {
              monthlyPaid += allocAmount
              if (pDate >= startOfMonth) thisMonthCollectedMonthly += allocAmount
            }
          })
        }

        if (pDate < startOfMonth) churchPaidLastMonth += amount
      })

      totalCollected += churchTotalPaid

      const { expectedAnnual, expectedMonthly, totalExpected: churchExpectedToday } = getExpectedUpToDate(church.created_at, today)
      totalExpectedAnnual += expectedAnnual
      totalExpectedMonthly += expectedMonthly
      totalExpected += churchExpectedToday

      const { totalExpected: churchExpectedLastMonth } = getExpectedUpToDate(church.created_at, endOfLastMonth)
      const churchExpectedThisMonth = Math.max(0, churchExpectedToday - churchExpectedLastMonth)
      const arrearsBroughtForward = Math.max(0, churchExpectedLastMonth - churchPaidLastMonth)
      thisMonthExpected += (churchExpectedThisMonth + arrearsBroughtForward)

      const overallStatus = getPeriodStatus(churchTotalPaid, churchExpectedToday)
      let annualStatus: 'Paid' | 'Partial' | 'Overdue' | 'N/A' = getPeriodStatus(annualPaid, expectedAnnual)
      const monthlyStatus = getPeriodStatus(monthlyPaid, expectedMonthly)

      if (expectedAnnual === 0 && annualPaid === 0) annualStatus = 'N/A'

      if (overallStatus === 'Paid') compliantChurches++
      else if (overallStatus === 'Partial') partialChurches++
      else overdueChurches++

      outstanding += Math.max(0, churchExpectedToday - churchTotalPaid)
      outstandingAnnual += Math.max(0, expectedAnnual - annualPaid)
      outstandingMonthly += Math.max(0, expectedMonthly - monthlyPaid)

      if (churchTotalPaid > 0) {
        totalCollectedAnnual += annualPaid
        totalCollectedMonthly += monthlyPaid
      }

      return {
        id: church.id,
        church_code: church.church_code,
        church_name: church.church_name,
        pastor_name: church.pastor_name,
        pastor_phone: church.pastor_phone,
        treasurer_name: church.treasurer_name,
        contact_phone: church.contact_phone,
        status: overallStatus,
        annualStatus,
        monthlyStatus,
        amountPaid: churchTotalPaid,
        outstanding: Math.max(0, churchExpectedToday - churchTotalPaid),
        creditBalance: getCreditBalance(churchTotalPaid, churchExpectedToday),
        annualCredit: Math.max(0, annualPaid - expectedAnnual),
        monthlyCredit: Math.max(0, monthlyPaid - expectedMonthly),
        annualPaid,
        monthlyPaid,
        annualOutstanding: Math.max(0, expectedAnnual - annualPaid),
        monthlyOutstanding: Math.max(0, expectedMonthly - monthlyPaid),
      }
    })

    const compliancePct = region.churches.length > 0 ? (compliantChurches / region.churches.length) * 100 : 0
    const thisMonthCollected = thisMonthCollectedAnnual + thisMonthCollectedMonthly
    const thisMonthCollectionPct = thisMonthExpected > 0 ? (thisMonthCollected / thisMonthExpected) * 100 : 0

    return {
      regionName: region.name,
      chairmanName: region.chairman_name,
      totalCollected, totalCollectedAnnual, totalCollectedMonthly,
      totalExpectedAnnual, totalExpectedMonthly, totalExpected,
      outstanding, outstandingAnnual, outstandingMonthly,
      thisMonthCollectedAnnual, thisMonthCollectedMonthly, thisMonthExpected, thisMonthCollectionPct,
      compliancePct, compliantChurches, partialChurches, overdueChurches,
      churches: churchesData,
    }
  } catch (error) {
    console.error('Failed to fetch regional stats:', error)
    return { error: 'Internal Server Error' }
  }
}