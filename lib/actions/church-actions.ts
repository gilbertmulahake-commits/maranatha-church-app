'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

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
    return await prisma.church.findMany({
      include: { region: true },
      orderBy: { church_code: 'asc' },
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