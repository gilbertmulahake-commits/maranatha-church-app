'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getExpectedUpToDate, getCreditBalance, getPeriodStatus } from '@/lib/utils/financial'

const regionSchema = z.object({
  name: z.string().min(1, 'Region Name is required'),
  chairman_name: z.string().min(1, 'Chairman Name is required'),
  contact_phone: z.string().min(10, 'Valid phone number is required'),
})

export async function getRegions() {
  try {
    return await prisma.region.findMany({ orderBy: { name: 'asc' } })
  } catch (error) {
    console.error('Failed to fetch regions:', error)
    return []
  }
}

export async function getRegionsWithStats() {
  try {
    const regions = await prisma.region.findMany({
      include: { churches: { include: { payments: true } } }, // Simplified: Just need total collected
      orderBy: { name: 'asc' },
    })

    const now = new Date()

    return regions.map((region) => {
      let compliantChurches = 0
      let totalCollected = 0
      const churchCount = region.churches.length

      region.churches.forEach((church) => {
        const totalPaid = church.payments.reduce((sum, p) => sum + Number(p.amount_paid), 0)
        totalCollected += totalPaid
        
        const { totalExpected: churchExpected } = getExpectedUpToDate(church.created_at, now)
        if (getPeriodStatus(totalPaid, churchExpected) === 'Paid') compliantChurches++
      })

      const compliancePct = churchCount > 0 ? (compliantChurches / churchCount) * 100 : 0

      return {
        id: region.id,
        name: region.name,
        chairman_name: region.chairman_name,
        contact_phone: region.contact_phone,
        churchCount,
        compliancePct,
        totalCollected,
      }
    })
  } catch (error) {
    console.error('Failed to fetch regions with stats:', error)
    return []
  }
}

export async function getRegionStats() {
  try {
    const regions = await prisma.region.findMany({
      include: { churches: { include: { payments: { where: { status: 'Paid' } } } } },
    })

    const now = new Date()

    let totalCollected = 0
    let totalCollectedAnnual = 0
    let totalCollectedMonthly = 0
    let totalArrears = 0
    let totalArrearsAnnual = 0
    let totalArrearsMonthly = 0
    let totalCompliancePct = 0
    let regionsAtRisk = 0
    let topRegions: { name: string, compliancePct: number }[] = []
    let maxCompliance = -1

    regions.forEach((region) => {
      let compliantChurches = 0
      let regionCollectedAnnual = 0
      let regionCollectedMonthly = 0
      let regionExpectedAnnual = 0
      let regionExpectedMonthly = 0
      const churchCount = region.churches.length

      region.churches.forEach((church) => {
        church.payments.forEach(p => {
          const amt = Number(p.amount_paid)
          if (p.payment_type === 'Annual') regionCollectedAnnual += amt
          else regionCollectedMonthly += amt
        })
        
        const { expectedAnnual, expectedMonthly, totalExpected: churchExpected } = getExpectedUpToDate(church.created_at, now)
        regionExpectedAnnual += expectedAnnual
        regionExpectedMonthly += expectedMonthly

        const totalPaid = church.payments.reduce((sum, p) => sum + Number(p.amount_paid), 0)
        if (getPeriodStatus(totalPaid, churchExpected) === 'Paid') compliantChurches++
      })

      totalCollectedAnnual += regionCollectedAnnual
      totalCollectedMonthly += regionCollectedMonthly
      totalCollected += (regionCollectedAnnual + regionCollectedMonthly)

      const regionArrearsAnnual = Math.max(0, regionExpectedAnnual - regionCollectedAnnual)
      const regionArrearsMonthly = Math.max(0, regionExpectedMonthly - regionCollectedMonthly)
      totalArrearsAnnual += regionArrearsAnnual
      totalArrearsMonthly += regionArrearsMonthly
      totalArrears += (regionArrearsAnnual + regionArrearsMonthly)

      const compliancePct = churchCount > 0 ? (compliantChurches / churchCount) * 100 : 0
      totalCompliancePct += compliancePct

      if (compliancePct < 50) regionsAtRisk++
      if (compliancePct > maxCompliance) {
        maxCompliance = compliancePct
        topRegions = [{ name: region.name, compliancePct }]
      } else if (compliancePct === maxCompliance) {
        topRegions.push({ name: region.name, compliancePct })
      }
    })

    topRegions.sort((a, b) => a.name.localeCompare(b.name))
    const averageCompliance = regions.length > 0 ? totalCompliancePct / regions.length : 0

    return {
      totalCollected, totalCollectedAnnual, totalCollectedMonthly,
      totalArrears, totalArrearsAnnual, totalArrearsMonthly,
      averageCompliance, regionsAtRisk,
      topRegionName: topRegions[0]?.name ?? 'N/A',
      topRegionPct: maxCompliance >= 0 ? maxCompliance : 0,
      topRegionTieCount: topRegions.length,
    }
  } catch (error) {
    console.error('Failed to fetch region stats:', error)
    return {
      totalCollected: 0, totalCollectedAnnual: 0, totalCollectedMonthly: 0,
      totalArrears: 0, totalArrearsAnnual: 0, totalArrearsMonthly: 0,
      averageCompliance: 0, regionsAtRisk: 0,
      topRegionName: 'N/A', topRegionPct: 0, topRegionTieCount: 0,
    }
  }
}

export async function getSingleRegionStats(regionId: string) {
  try {
    const region = await prisma.region.findUnique({
      where: { id: regionId },
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

    let thisMonthCollectedAnnual = 0
    let thisMonthCollectedMonthly = 0
    let thisMonthExpected = 0

    let compliantChurches = 0
    let partialChurches = 0
    let overdueChurches = 0

    const churchesData = region.churches.map((church) => {
      let churchTotalPaid = 0
      let annualPaid = 0
      let monthlyPaid = 0
      let churchPaidLastMonth = 0

      church.payments.forEach((p) => {
        const pDate = new Date(p.payment_date)
        const amount = Number(p.amount_paid)
        churchTotalPaid += amount

        // READ FROM ALLOCATIONS
        if (p.allocations.length === 0) {
          if (p.payment_type === 'Annual') annualPaid += amount
          else monthlyPaid += amount
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
      let annualStatus: 'Paid' | 'Partial' | 'Overdue' | 'N/A' = getPeriodStatus(annualPaid, expectedAnnual) as any
      const monthlyStatus = getPeriodStatus(monthlyPaid, expectedMonthly)

      if (expectedAnnual === 0 && annualPaid === 0) annualStatus = 'N/A'

      if (overallStatus === 'Paid') compliantChurches++
      else if (overallStatus === 'Partial') partialChurches++
      else overdueChurches++

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

    // Sum totals from the mapped data
    churchesData.forEach(d => {
      totalCollectedAnnual += d.annualPaid
      totalCollectedMonthly += d.monthlyPaid
    })

    const outstanding = Math.max(0, totalExpected - totalCollected)
    const outstandingAnnual = Math.max(0, totalExpectedAnnual - totalCollectedAnnual)
    const outstandingMonthly = Math.max(0, totalExpectedMonthly - totalCollectedMonthly)
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
    console.error('Failed to fetch single region stats:', error)
    return { error: 'Internal Server Error' }
  }
}

export async function createRegion(formData: FormData) {
  const rawData = {
    name: formData.get('name') as string,
    chairman_name: formData.get('chairman_name') as string,
    contact_phone: formData.get('contact_phone') as string,
  }
  const validated = regionSchema.safeParse(rawData)
  if (!validated.success) return { error: validated.error.issues[0].message }

  try {
    await prisma.region.create({ data: validated.data })
    revalidatePath('/dashboard/regions')
    return { success: true }
  } catch (error) {
    return { error: 'Failed to create region. Name might already exist.' }
  }
}

export async function updateRegion(id: string, formData: FormData) {
  const rawData = {
    name: formData.get('name') as string,
    chairman_name: formData.get('chairman_name') as string,
    contact_phone: formData.get('contact_phone') as string,
  }
  const validated = regionSchema.safeParse(rawData)
  if (!validated.success) return { error: validated.error.issues[0].message }

  try {
    await prisma.region.update({ where: { id }, data: validated.data })
    revalidatePath('/dashboard/regions')
    return { success: true }
  } catch (error) {
    return { error: 'Failed to update region.' }
  }
}