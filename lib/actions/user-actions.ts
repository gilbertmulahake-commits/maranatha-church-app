'use server'

import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { z } from 'zod'

// Validate incoming role against the Prisma Role enum
const roleSchema = z.enum([
  'NATIONAL_TREASURER',
  'NATIONAL_OVERSEER',
  'REGIONAL_CHAIRMAN',
  'REGIONAL_TREASURER',
  'LOCAL_PASTOR',
  'CHURCH_TREASURER',
])

export type UserProfile = {
  email: string
  role: string
  regionName: string | null
  churchName: string | null
}

export type SystemUser = {
  id: string
  email: string
  role: string
  regionName: string | null
  churchName: string | null
  createdAt: string
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

/**
 * ADMIN: Fetch all users in the system.
 * Strictly restricted to National HQ roles.
 */
export async function getSystemUsers(): Promise<SystemUser[]> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    
    // Security: Only National HQ can list users
    if (!dbUser || !dbUser.role.includes('NATIONAL')) {
      return []
    }

    const users = await prisma.user.findMany({
      include: {
        region: true,
        church: true,
      },
      orderBy: { created_at: 'desc' }
    })

    return users.map(u => ({
      id: u.id,
      email: u.email,
      role: u.role,
      regionName: u.region?.name || null,
      churchName: u.church?.church_name || null,
      createdAt: u.created_at.toISOString()
    }))

  } catch (error) {
    console.error('Failed to fetch system users:', error)
    return []
  }
}

/**
 * ADMIN: Invite a new user.
 * Creates a Supabase Auth account, then links it to a Prisma User record.
 */
export async function inviteUser(formData: FormData) {
  try {
    // 1. Verify Caller is National HQ
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }
    
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (!dbUser || !dbUser.role.includes('NATIONAL')) return { error: 'Unauthorized. Only National HQ can invite users.' }

    // 2. Extract Data
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const region_id = (formData.get('region_id') as string) || null
    const church_id = (formData.get('church_id') as string) || null

    // FIX: Validate role with Zod instead of `as any`
    const roleValue = formData.get('role')
    if (typeof roleValue !== 'string') {
      return { error: 'Role is required.' }
    }
    const roleParsed = roleSchema.safeParse(roleValue)
    if (!roleParsed.success) {
      return { error: 'Invalid role selected.' }
    }
    const role = roleParsed.data

    if (!email || !password) {
      return { error: 'Email and password are required.' }
    }

    // 3. Create Supabase Auth User (Requires Service Role Key)
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })

    if (authError) return { error: authError.message }

    // 4. Create Prisma User
    try {
      await prisma.user.create({
        data: {
          id: authData.user.id, // Link the Supabase Auth ID
          email,
          role,
          region_id,
          church_id
        }
      })
    } catch (dbError) {
      // ROLLBACK: If the Prisma insert fails (e.g., region_id is invalid), 
      // delete the newly created Supabase Auth user so we don't leave an orphaned account.
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw dbError
    }

    return { success: true }

  } catch (error) {
    console.error('Invite error:', error)
    
    // Handle Prisma unique constraint error gracefully (P2002)
    if (
      typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002'
    ) {
      return { error: 'A user with this email or ID already exists in the database.' }
    }
    
    const message = error instanceof Error ? error.message : 'Failed to invite user'
    return { error: message }
  }
}