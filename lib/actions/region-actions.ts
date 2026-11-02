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

// Basic fetch (used for dropdowns in other pages)
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
      const churchCount = region.churches.length

      region.churches.forEach((church) => {
        const totalPaid = church.payments.reduce((sum, p) => sum + Number(p.amount_paid), 0)
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
      }
    })
  } catch (error) {
    console.error('Failed to fetch regions with stats:', error)
    return []
  }
}

// Fetch KPI Stats for the Regions Dashboard
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

    let totalArrears = 0
    let totalCompliancePct = 0
    let regionsAtRisk = 0
    let topRegion = { name: 'N/A', compliancePct: 0 }

    regions.forEach((region) => {
      let compliantChurches = 0
      let regionCollected = 0
      const churchCount = region.churches.length
      const regionExpected = churchCount * totalExpected
      
      region.churches.forEach((church) => {
        const totalPaid = church.payments.reduce((sum, p) => sum + Number(p.amount_paid), 0)
        regionCollected += totalPaid
        if (getChurchStatus(totalPaid, totalExpected) === 'Paid') {
          compliantChurches++
        }
      })

      totalArrears += Math.max(0, regionExpected - regionCollected)

      const compliancePct = churchCount > 0 ? (compliantChurches / churchCount) * 100 : 0
      totalCompliancePct += compliancePct

      if (compliancePct < 50) regionsAtRisk++
      if (compliancePct > topRegion.compliancePct) {
        topRegion = { name: region.name, compliancePct }
      }
    })

    const averageCompliance = regions.length > 0 ? totalCompliancePct / regions.length : 0

    return {
      totalArrears,
      averageCompliance,
      regionsAtRisk,
      topRegionName: topRegion.name,
      topRegionPct: topRegion.compliancePct,
    }
  } catch (error) {
    console.error('Failed to fetch region stats:', error)
    return {
      totalArrears: 0,
      averageCompliance: 0,
      regionsAtRisk: 0,
      topRegionName: 'N/A',
      topRegionPct: 0,
    }
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