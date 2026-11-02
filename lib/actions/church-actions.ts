'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getExpectedToDate, getChurchStatus } from '@/lib/utils/financial'

// Zod schema for validation
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
    // 1. Fetch churches with their region and ALL payments
    const churches = await prisma.church.findMany({
      include: { 
        region: true,
        payments: {
          where: { status: 'Paid' }
        } 
      },
      orderBy: { church_code: 'asc' },
    })

    const { totalExpected } = getExpectedToDate()

    // 2. Map and calculate financial status for each church
    return churches.map((church) => {
      const totalPaid = church.payments.reduce((sum, p) => sum + Number(p.amount_paid), 0)
      const status = getChurchStatus(totalPaid, totalExpected)

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
        outstanding: Math.max(0, totalExpected - totalPaid),
        status: status,
      }
    })
  } catch (error) {
    console.error('Failed to fetch churches:', error)
    return []
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

  if (!validated.success) {
    return { error: validated.error.issues[0].message }
  }

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

export async function getChurchStats() {
  try {
    const churches = await prisma.church.findMany({
      include: { payments: { where: { status: 'Paid' } } },
    })

    const { totalExpected } = getExpectedToDate()

    let compliant = 0
    let partial = 0
    let overdue = 0

    churches.forEach((church) => {
      const totalPaid = church.payments.reduce((sum, p) => sum + Number(p.amount_paid), 0)
      const status = getChurchStatus(totalPaid, totalExpected)

      if (status === 'Paid') compliant++
      else if (status === 'Partial') partial++
      else overdue++
    })

    return {
      total: churches.length,
      compliant,
      partial,
      overdue,
    }
  } catch (error) {
    console.error('Failed to fetch church stats:', error)
    return { total: 0, compliant: 0, partial: 0, overdue: 0 }
  }
}