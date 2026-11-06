'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getExpectedToDate, getChurchStatus } from '@/lib/utils/financial'

// --- Zod Schemas ---
const regionSchema = z.object({
  name: z.string().min(1, 'Region Name is required'),
  chairman_name: z.string().min(1, 'Chairman Name is required'),
  contact_phone: z.string().min(10, 'Valid phone number is required'),
})

// --- Read Operations ---

// Basic fetch (used for dropdowns)
export async function getRegions() {
  try {
    return await prisma.region.findMany({
      orderBy: { name: 'asc' },
    })
  } catch (error) {
    console.error('Failed to fetch regions:', error)
    return []
  }
}

// Advanced fetch with Compliance Stats (used for the Regions Data Table)
export async function getRegionsWithStats() {
  try {
    const regions = await prisma.region.findMany({
      include: {
        churches: {
          include: {
            payments: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    const { totalExpected } = getExpectedToDate()

    return regions.map((region) => {
      let compliantChurches = 0
      let totalCollected = 0
      const churchCount = region.churches.length

      region.churches.forEach((church) => {
        const totalPaid = church.payments.reduce((sum, p) => sum + Number(p.amount_paid), 0)
        totalCollected += totalPaid
        if (getChurchStatus(totalPaid, totalExpected) === 'Paid') {
          compliantChurches++
        }
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

// Fetch KPI Stats for the Regions Dashboard (all regions aggregated)
export async function getRegionStats() {
  try {
    const regions = await prisma.region.findMany({
      include: {
        churches: {
          include: {
            payments: { where: { status: 'Paid' } },
          },
        },
      },
    })

    const { totalExpected } = getExpectedToDate()

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
      const churchCount = region.churches.length

      const regionExpectedAnnual = churchCount * 5000
      const regionExpectedMonthly = churchCount * 6000

      region.churches.forEach((church) => {
        church.payments.forEach(p => {
          const amt = Number(p.amount_paid)
          if (p.payment_type === 'Annual') regionCollectedAnnual += amt
          else regionCollectedMonthly += amt
        })
        const totalPaid = church.payments.reduce((sum, p) => sum + Number(p.amount_paid), 0)
        if (getChurchStatus(totalPaid, totalExpected) === 'Paid') compliantChurches++
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
      totalCollected,
      totalCollectedAnnual,
      totalCollectedMonthly,
      totalArrears,
      totalArrearsAnnual,
      totalArrearsMonthly,
      averageCompliance,
      regionsAtRisk,
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

// NEW: Fetch stats for a SINGLE region (used by /dashboard/regions/[id])
export async function getSingleRegionStats(regionId: string) {
  try {
    const region = await prisma.region.findUnique({
      where: { id: regionId },
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
    const totalExpectedAnnual = totalChurches * 5000
    const totalExpectedMonthly = totalChurches * 6000
    const totalExpected = totalExpectedAnnual + totalExpectedMonthly

    const { totalExpected: expectedToDate } = getExpectedToDate()

    let totalCollected = 0
    let totalCollectedAnnual = 0
    let totalCollectedMonthly = 0
    let totalThisMonth = 0
    let compliantChurches = 0
    let partialChurches = 0
    let overdueChurches = 0

    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()

    const churchesData = region.churches.map((church) => {
      let churchTotalPaid = 0

      church.payments.forEach((payment) => {
        const amount = Number(payment.amount_paid)
        churchTotalPaid += amount

        if (payment.payment_type === 'Annual') totalCollectedAnnual += amount
        else totalCollectedMonthly += amount

        const pDate = new Date(payment.payment_date)
        if (pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear) {
          totalThisMonth += amount
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
      totalThisMonth,
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
    console.error('Failed to fetch single region stats:', error)
    return { error: 'Internal Server Error' }
  }
}

// --- Write Operations ---

export async function createRegion(formData: FormData) {
  const rawData = {
    name: formData.get('name') as string,
    chairman_name: formData.get('chairman_name') as string,
    contact_phone: formData.get('contact_phone') as string,
  }

  const validated = regionSchema.safeParse(rawData)

  if (!validated.success) {
    return { error: validated.error.issues[0].message }
  }

  try {
    await prisma.region.create({
      data: {
        name: validated.data.name,
        chairman_name: validated.data.chairman_name,
        contact_phone: validated.data.contact_phone,
      },
    })
    revalidatePath('/dashboard/regions')
    return { success: true }
  } catch (error) {
    console.error('Failed to create region:', error)
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

  if (!validated.success) {
    return { error: validated.error.issues[0].message }
  }

  try {
    await prisma.region.update({
      where: { id },
      data: {
        name: validated.data.name,
        chairman_name: validated.data.chairman_name,
        contact_phone: validated.data.contact_phone,
      },
    })
    revalidatePath('/dashboard/regions')
    return { success: true }
  } catch (error) {
    console.error('Failed to update region:', error)
    return { error: 'Failed to update region.' }
  }
}