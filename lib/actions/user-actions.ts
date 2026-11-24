'use server'

import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/actions/audit-actions'
import { isOperationsAdmin } from '@/lib/auth/roles'
import { PROTECTED_USER_IDS } from '@/lib/auth/protected-users'
import { Role } from '@prisma/client'
import { z } from 'zod'

export type SystemUser = {
  id: string
  email: string
  role: Role
  regionName: string | null
  churchName: string | null
  isActive: boolean
  requiresPasswordReset: boolean
  createdAt: string
}

export type UserProfile = {
  id: string
  email: string
  role: Role
  first_name: string | null
  last_name: string | null
  phone: string | null
  bio: string | null
  regionName: string | null
  churchName: string | null
}

// Helper to verify the current user has Operations/Admin privileges
async function verifyOperationsAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  if (!dbUser || !isOperationsAdmin(dbUser.role)) {
    throw new Error('Forbidden: Requires Operations Admin privileges')
  }
  return { actorId: user.id, actorEmail: user.email, actorRole: dbUser.role }
}

export async function getSystemUsers(): Promise<SystemUser[]> {
  try {
    const { actorRole } = await verifyOperationsAdmin()
    
    const users = await prisma.user.findMany({
      include: {
        region: { select: { name: true } },
        church: { select: { church_name: true } }
      },
      orderBy: { created_at: 'desc' }
    })

    // Filter out protected accounts if the viewer is not SYSTEM_ADMIN
    const filteredUsers = users.filter(u => {
      if (actorRole !== 'SYSTEM_ADMIN' && PROTECTED_USER_IDS.includes(u.id)) {
        return false
      }
      return true
    })

    return filteredUsers.map(u => ({
      id: u.id,
      email: u.email,
      role: u.role,
      regionName: u.region?.name || null,
      churchName: u.church?.church_name || null,
      isActive: u.is_active ?? true,
      requiresPasswordReset: u.requires_password_reset ?? false,
      createdAt: u.created_at.toISOString(),
    }))
  } catch (error) {
    console.error('Failed to fetch users:', error)
    return []
  }
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      region: { select: { name: true } },
      church: { select: { church_name: true } }
    }
  })

  if (!dbUser) return null

  return {
    id: dbUser.id,
    email: dbUser.email,
    role: dbUser.role,
    first_name: dbUser.first_name,
    last_name: dbUser.last_name,
    phone: dbUser.phone,
    bio: dbUser.bio,
    regionName: dbUser.region?.name || null,
    churchName: dbUser.church?.church_name || null,
  }
}

const ProfileSchema = z.object({
  first_name: z.string().trim().max(80).transform(v => v === '' ? null : v),
  last_name: z.string().trim().max(80).transform(v => v === '' ? null : v),
  phone: z.string().trim().max(20).transform(v => v === '' ? null : v),
  bio: z.string().trim().max(500).transform(v => v === '' ? null : v),
})

export async function updateUserProfile(formData: FormData) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const raw = {
      first_name: formData.get('first_name') ?? '',
      last_name: formData.get('last_name') ?? '',
      phone: formData.get('phone') ?? '',
      bio: formData.get('bio') ?? '',
    }

    const parsed = ProfileSchema.safeParse(raw)
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Invalid profile data' }
    }

    const beforeUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (!beforeUser) return { error: 'User not found' }

    await prisma.user.update({
      where: { id: user.id },
      data: parsed.data,
    })

    // Audit identity fields only. bio is cosmetic and deliberately not audited.
    const identityChanged =
      beforeUser.first_name !== parsed.data.first_name ||
      beforeUser.last_name !== parsed.data.last_name ||
      beforeUser.phone !== parsed.data.phone

    if (identityChanged) {
      await logAudit({
        action: 'USER_PROFILE_UPDATED',
        entity: 'User',
        entityId: user.id,
        beforeData: {
          first_name: beforeUser.first_name,
          last_name: beforeUser.last_name,
          phone: beforeUser.phone,
        },
        afterData: {
          first_name: parsed.data.first_name,
          last_name: parsed.data.last_name,
          phone: parsed.data.phone,
        },
      })
    }

    revalidatePath('/dashboard', 'layout')
    revalidatePath('/dashboard/settings/profile')
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update profile'
    return { error: message }
  }
}

export async function inviteUser(formData: FormData) {
  try {
    await verifyOperationsAdmin()

    const email = formData.get('email') as string
    const role = formData.get('role') as Role
    const regionId = (formData.get('region_id') as string) || undefined
    const churchId = (formData.get('church_id') as string) || undefined

    if (role === 'SYSTEM_ADMIN') {
      return { error: 'Cannot invite SYSTEM_ADMIN accounts via UI.' }
    }

    const supabase = await createClient()
    
    const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/login/update-password`,
    })

    if (authError || !authData.user) {
      return { error: authError?.message || 'Failed to send invite' }
    }

    const newUser = await prisma.user.create({
      data: {
        id: authData.user.id,
        email: email,
        role: role,
        region_id: regionId || null,
        church_id: churchId || null,
        is_active: true,
        requires_password_reset: true,
      }
    })

    await logAudit({
      action: 'USER_INVITED',
      entity: 'User',
      entityId: newUser.id,
      beforeData: null,
      afterData: { email, role, regionId, churchId },
    })

    revalidatePath('/dashboard/users')
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to invite user'
    return { error: message }
  }
}

export async function toggleUserStatus(userId: string, isActive: boolean) {
  try {
    const { actorRole } = await verifyOperationsAdmin()

    if (PROTECTED_USER_IDS.includes(userId) && actorRole !== 'SYSTEM_ADMIN') {
      return { error: 'Cannot modify protected accounts.' }
    }

    const beforeUser = await prisma.user.findUnique({ where: { id: userId } })
    if (!beforeUser) return { error: 'User not found' }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { is_active: isActive }
    })

    await logAudit({
      action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      entity: 'User',
      entityId: userId,
      beforeData: { is_active: beforeUser.is_active },
      afterData: { is_active: updatedUser.is_active },
    })

    revalidatePath('/dashboard/users')
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update user status'
    return { error: message }
  }
}

export async function forcePasswordReset(userId: string, origin: string) {
  try {
    const { actorRole } = await verifyOperationsAdmin()

    if (PROTECTED_USER_IDS.includes(userId) && actorRole !== 'SYSTEM_ADMIN') {
      return { error: 'Cannot modify protected accounts.' }
    }

    const beforeUser = await prisma.user.findUnique({ where: { id: userId } })
    if (!beforeUser) return { error: 'User not found' }

    const supabase = await createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(beforeUser.email, {
      redirectTo: `${origin}/login/update-password`,
    })

    if (resetError) {
      return { error: resetError.message }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { requires_password_reset: true }
    })

    await logAudit({
      action: 'PASSWORD_RESET_FORCED',
      entity: 'User',
      entityId: userId,
      beforeData: { requires_password_reset: beforeUser.requires_password_reset },
      afterData: { requires_password_reset: true },
    })

    revalidatePath('/dashboard/users')
    return { success: true, warning: 'Reset email sent.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to force password reset'
    return { error: message }
  }
}

export async function updateUserRole(userId: string, newRole: string) {
  try {
    const { actorRole } = await verifyOperationsAdmin()

    if (PROTECTED_USER_IDS.includes(userId) && actorRole !== 'SYSTEM_ADMIN') {
      return { error: 'Cannot modify protected accounts.' }
    }

    const beforeUser = await prisma.user.findUnique({ where: { id: userId } })
    if (!beforeUser) return { error: 'User not found' }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: newRole as Role }
    })

    await logAudit({
      action: 'USER_ROLE_CHANGED',
      entity: 'User',
      entityId: userId,
      beforeData: { role: beforeUser.role },
      afterData: { role: updatedUser.role },
    })

    revalidatePath('/dashboard/users')
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update role'
    return { error: message }
  }
}

export async function clearPasswordResetFlag() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const beforeUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (!beforeUser) return { error: 'User not found' }

    await prisma.user.update({
      where: { id: user.id },
      data: { requires_password_reset: false }
    })

    await logAudit({
      action: 'PASSWORD_CHANGED',
      entity: 'User',
      entityId: user.id,
      beforeData: { requires_password_reset: beforeUser.requires_password_reset },
      afterData: { requires_password_reset: false },
    })

    return { success: true }
  } catch {
    return { error: 'Failed to clear reset flag' }
  }
}

export async function updatePasswordAndClearFlag(password: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const beforeUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (!beforeUser) return { error: 'User not found' }

    // 1. Update the actual password in Supabase Auth
    const { error: authError } = await supabase.auth.updateUser({ password })
    if (authError) {
      return { error: authError.message }
    }

    // 2. Clear the flag in Prisma
    await prisma.user.update({
      where: { id: user.id },
      data: { requires_password_reset: false }
    })

    // 3. Log the audit event
    await logAudit({
      action: 'PASSWORD_CHANGED',
      entity: 'User',
      entityId: user.id,
      beforeData: { requires_password_reset: true },
      afterData: { requires_password_reset: false },
    })

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update password'
    return { error: message }
  }
}