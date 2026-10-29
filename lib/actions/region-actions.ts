'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const regionSchema = z.object({
  name: z.string().min(1, 'Region Name is required'),
  chairman_name: z.string().min(1, 'Chairman Name is required'),
  contact_phone: z.string().min(10, 'Valid phone number is required'),
})

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