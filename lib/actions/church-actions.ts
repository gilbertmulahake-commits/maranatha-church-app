'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getExpectedUpToDate, getPeriodStatus } from '@/lib/utils/financial'
import { logAudit } from '@/lib/actions/audit-actions'
import { verifyOperationsAccess } from '@/lib/auth/guards'

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
    // RBAC GUARD
    await verifyOperationsAccess()

    const created = await prisma.church.create({
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

    await logAudit({
      action: 'CHURCH_CREATED',
      entity: 'Church',
      entityId: created.id,
      beforeData: null,
      afterData: {
        church_code: created.church_code,
        church_name: created.church_name,
        region_id: created.region_id,
        pastor_name: created.pastor_name,
        pastor_phone: created.pastor_phone,
        treasurer_name: created.treasurer_name,
        contact_phone: created.contact_phone,
      },
    })

    revalidatePath('/dashboard/churches')
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create church. Code might already exist.'
    return { error: message }
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
    // RBAC GUARD
    await verifyOperationsAccess()

    const beforeChurch = await prisma.church.findUnique({
      where: { id },
      select: {
        church_name: true,
        pastor_name: true,
        pastor_phone: true,
        treasurer_name: true,
        contact_phone: true,
        church_code: true,
      },
    })
    if (!beforeChurch) return { error: 'Church not found.' }

    const updated = await prisma.church.update({
      where: { id },
      data: {
        church_name: rawData.church_name,
        pastor_name: rawData.pastor_name,
        pastor_phone: rawData.pastor_phone,
        treasurer_name: rawData.treasurer_name,
        contact_phone: rawData.contact_phone,
      },
    })

    await logAudit({
      action: 'CHURCH_UPDATED',
      entity: 'Church',
      entityId: id,
      beforeData: {
        church_name: beforeChurch.church_name,
        pastor_name: beforeChurch.pastor_name,
        pastor_phone: beforeChurch.pastor_phone,
        treasurer_name: beforeChurch.treasurer_name,
        contact_phone: beforeChurch.contact_phone,
      },
      afterData: {
        church_name: updated.church_name,
        pastor_name: updated.pastor_name,
        pastor_phone: updated.pastor_phone,
        treasurer_name: updated.treasurer_name,
        contact_phone: updated.contact_phone,
      },
      metadata: { church_code: beforeChurch.church_code },
    })

    revalidatePath('/dashboard/churches')
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update church details.'
    return { error: message }
  }
}

export async function deleteChurch(id: string) {
  try {
    // RBAC GUARD
    await verifyOperationsAccess()

    const beforeChurch = await prisma.church.findUnique({
      where: { id },
    })
    if (!beforeChurch) return { error: 'Church not found.' }

    await prisma.church.delete({ where: { id } })

    await logAudit({
      action: 'CHURCH_DELETED',
      entity: 'Church',
      entityId: id,
      beforeData: {
        church_code: beforeChurch.church_code,
        church_name: beforeChurch.church_name,
        region_id: beforeChurch.region_id,
        pastor_name: beforeChurch.pastor_name,
        pastor_phone: beforeChurch.pastor_phone,
        treasurer_name: beforeChurch.treasurer_name,
        contact_phone: beforeChurch.contact_phone,
        created_at: beforeChurch.created_at.toISOString(),
      },
      afterData: null,
      metadata: {
        church_code: beforeChurch.church_code,
        church_name: beforeChurch.church_name,
      },
    })

    revalidatePath('/dashboard/churches')
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete church. They may have linked payments.'
    return { error: message }
  }
}