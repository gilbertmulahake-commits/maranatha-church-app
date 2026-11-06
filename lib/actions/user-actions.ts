'use server'

import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export type UserProfile = {
  email: string
  role: string
  regionName: string | null
  churchName: string | null
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user || !user.email) return null

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        region: true,
        church: true,
      }
    })

    if (!dbUser) {
      // Edge case: User is in Supabase Auth but not in Prisma DB yet
      return { email: user.email, role: 'UNASSIGNED', regionName: null, churchName: null }
    }

    return {
      email: user.email,
      role: dbUser.role,
      regionName: dbUser.region?.name || null,
      churchName: dbUser.church?.church_name || null,
    }

  } catch (error) {
    console.error('Failed to fetch user profile:', error)
    return null
  }
}