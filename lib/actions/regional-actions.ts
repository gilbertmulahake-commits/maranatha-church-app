'use server'

import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export type RegionalChurchData = {
  id: string
  church_code: string
  church_name: string
  pastor_name: string
  pastor_phone: string
  treasurer_name: string
  contact_phone: string
  status: 'Paid' | 'Pending'
  amountPaid: number
}

export type RegionalStatsSuccess = {
  regionName: string
  chairmanName: string
  totalCollected: number
  totalExpected: number
  outstanding: number
  compliancePct: number
  churches: RegionalChurchData[]
}

export type RegionalStatsError = {
  error: string
}

export async function getRegionalStats(): Promise<RegionalStatsSuccess | RegionalStatsError> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'Not authenticated' }
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    })

    if (!dbUser || dbUser.role !== 'REGIONAL_CHAIRMAN' || !dbUser.region_id) {
      return { error: 'User is not a Regional Chairman or has no assigned region.' }
    }

    const region = await prisma.region.findUnique({
      where: { id: dbUser.region_id },
      include: {
        churches: {
          include: {
            payments: {
              orderBy: { payment_date: 'desc' },
            },
          },
        },
      },
    })

    if (!region) {
      return { error: 'Region not found' }
    }

    let totalCollected = 0
    const totalExpected = region.churches.length * 5000
    let churchesPaid = 0

    const churchesData: RegionalChurchData[] = region.churches.map((church) => {
      const churchPaid = church.payments.reduce((sum, payment) => sum + Number(payment.amount_paid), 0)
      const isPaid = churchPaid >= 5000 
      
      if (isPaid) churchesPaid++
      totalCollected += churchPaid

      return {
        id: church.id,
        church_code: church.church_code,
        church_name: church.church_name,
        pastor_name: church.pastor_name,
        pastor_phone: church.pastor_phone,
        treasurer_name: church.treasurer_name,
        contact_phone: church.contact_phone,
        status: isPaid ? 'Paid' : 'Pending',
        amountPaid: churchPaid,
      }
    })

    const outstanding = totalExpected - totalCollected
    const compliancePct = region.churches.length > 0 
      ? (churchesPaid / region.churches.length) * 100 
      : 0

    return {
      regionName: region.name,
      chairmanName: region.chairman_name,
      totalCollected,
      totalExpected,
      outstanding,
      compliancePct,
      churches: churchesData,
    }
  } catch (error) {
    console.error('Failed to fetch regional stats:', error)
    return { error: 'Internal Server Error' }
  }
}