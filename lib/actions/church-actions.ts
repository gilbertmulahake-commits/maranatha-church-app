'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getExpectedUpToDate, getPeriodStatus } from '@/lib/utils/financial'

const churchSchema = z.object({
  church_code: z.string().min(1, 'Church Code is required'),
  church_name: z.string().min(1, 'Church Name is required'),
  region_id: z.string().min(1, 'Region is required'),
  pastor_name: z.string().min(1, 'Pastor Name is required'),
  pastor_phone: z.string().min(10, 'Valid pastor phone is required'),
  treasurer_name: z.string().min(1, 'Treasurer Name is required'),
  contact_phone: z.string().min(10, 'Valid phone number is required'),
})

export async function getChurches() {
  try {
    const churches = await prisma.church.findMany({
      include: {
        region: true,
        payments: {
          where: { status: 'Paid' },
          include: { allocations: true },
        },
      },
      orderBy: { church_code: 'asc' },
    })

    const now = new Date()

    return churches.map((church) => {
      // Split by allocation_type (authoritative for Annual vs Monthly)
      let annualPaid = 0
      let monthlyPaid = 0

      church.payments.forEach((p) => {
        if (p.allocations.length === 0) {
          // Defensive fallback for pre-backfill data
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
      const { expectedAnnual, expectedMonthly, totalExpected } = getExpectedUpToDate(
        church.created_at,
        now
      )

      const annualOutstanding = Math.max(0, expectedAnnual - annualPaid)
      const monthlyOutstanding = Math.max(0, expectedMonthly - monthlyPaid)
      const totalOutstanding = annualOutstanding + monthlyOutstanding

      const annualCredit = Math.max(0, annualPaid - expectedAnnual)
      const monthlyCredit = Math.max(0, monthlyPaid - expectedMonthly)

      // FIX: Removed the unnecessary `as any` cast.
      // getPeriodStatus returns 'Paid' | 'Partial' | 'Overdue', which is
      // already assignable to 'Paid' | 'Partial' | 'Overdue' | 'N/A'.
      let annualStatus: 'Paid' | 'Partial' | 'Overdue' | 'N/A' = getPeriodStatus(
        annualPaid,
        expectedAnnual
      )
      const monthlyStatus = getPeriodStatus(monthlyPaid, expectedMonthly)

      if (expectedAnnual === 0 && annualPaid === 0) {
        annualStatus = 'N/A'
      }

      let overallStatus: 'Paid' | 'Partial' | 'Overdue' = 'Partial'
      if (annualStatus === 'Paid' && monthlyStatus === 'Paid') overallStatus = 'Paid'
      else if (annualStatus === 'Overdue' && monthlyStatus === 'Overdue')
        overallStatus = 'Overdue'

      return {
        id: church.id,
        church_code: church.church_code,
        church_name: church.church_name,
        region: church.region ? { name: church.region.name } : null,
        pastor_name: church.pastor_name,
        pastor_phone: church.pastor_phone,
        treasurer_name: church.treasurer_name,
        contact_phone: church.contact_phone,

        amountPaid: totalPaid,
        expected: totalExpected,
        outstanding: totalOutstanding,

        annualCredit,
        monthlyCredit,
        annualPaid,
        monthlyPaid,
        annualOutstanding,
        monthlyOutstanding,

        status: overallStatus,
        annualStatus,
        monthlyStatus,
      }
    })
  } catch (error) {
    console.error('Failed to fetch churches:', error)
    return []
  }
}

export async function getChurchStats() {
  try {
    const churches = await prisma.church.findMany({
      include: {
        payments: {
          where: { status: 'Paid' },
          include: { allocations: true },
        },
      },
    })

    let compliant = 0
    let partial = 0
    let overdue = 0
    const now = new Date()

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

      const aStat =
        expectedAnnual === 0 && annualPaid === 0
          ? 'N/A'
          : getPeriodStatus(annualPaid, expectedAnnual)
      const mStat = getPeriodStatus(monthlyPaid, expectedMonthly)

      let overallStatus = 'Partial'
      if (aStat === 'Paid' && mStat === 'Paid') overallStatus = 'Paid'
      else if (aStat === 'Overdue' && mStat === 'Overdue') overallStatus = 'Overdue'

      if (overallStatus === 'Paid') compliant++
      else if (overallStatus === 'Partial') partial++
      else overdue++
    })

    return { total: churches.length, compliant, partial, overdue, na: 0 }
  } catch (error) {
    console.error('Failed to fetch church stats:', error)
    return { total: 0, compliant: 0, partial: 0, overdue: 0, na: 0 }
  }
}

export async function createChurch(formData: FormData) {
  const rawData = {
    church_code: formData.get('church_code') as string,
    church_name: formData.get('church_name') as string,
    region_id: formData.get('region_id') as string,
    pastor_name: formData.get('pastor_name') as string,
    pastor_phone: formData.get('pastor_phone') as string,
    treasurer_name: formData.get('treasurer_name') as string,
    contact_phone: formData.get('contact_phone') as string,
  }

  const validated = churchSchema.safeParse(rawData)
  if (!validated.success) return { error: validated.error.issues[0].message }

  try {
    await prisma.church.create({
      data: {
        church_code: validated.data.church_code,
        church_name: validated.data.church_name,
        region_id: validated.data.region_id,
        pastor_name: validated.data.pastor_name,
        pastor_phone: validated.data.pastor_phone,
        treasurer_name: validated.data.treasurer_name,
        contact_phone: validated.data.contact_phone,
      },
    })
    revalidatePath('/dashboard/churches')
    return { success: true }
  } catch (error) {
    console.error('Failed to create church:', error)
    return { error: 'Failed to create church. Code might already exist.' }
  }
}

export async function updateChurch(id: string, formData: FormData) {
  const rawData = {
    church_name: formData.get('church_name') as string,
    pastor_name: formData.get('pastor_name') as string,
    pastor_phone: formData.get('pastor_phone') as string,
    treasurer_name: formData.get('treasurer_name') as string,
    contact_phone: formData.get('contact_phone') as string,
  }

  try {
    await prisma.church.update({
      where: { id },
      data: {
        church_name: rawData.church_name,
        pastor_name: rawData.pastor_name,
        pastor_phone: rawData.pastor_phone,
        treasurer_name: rawData.treasurer_name,
        contact_phone: rawData.contact_phone,
      },
    })
    revalidatePath('/dashboard/churches')
    return { success: true }
  } catch (error) {
    console.error('Failed to update church:', error)
    return { error: 'Failed to update church details.' }
  }
}

export async function deleteChurch(id: string) {
  try {
    await prisma.church.delete({ where: { id } })
    revalidatePath('/dashboard/churches')
    return { success: true }
  } catch (error) {
    console.error('Failed to delete church:', error)
    return { error: 'Failed to delete church. They may have linked payments.' }
  }
}