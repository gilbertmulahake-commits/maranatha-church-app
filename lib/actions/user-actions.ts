'use server'

import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { isProtectedUser } from '@/lib/auth/protected-users'
import { isNationalLevel } from '@/lib/auth/roles'
import { logAudit } from '@/lib/actions/audit-actions'

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
  isActive: boolean
  requiresPasswordReset: boolean
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
      return { email: user.email, role: 'UNASSIGNED', regionName: null, churchName: null }
    }

    if (!dbUser.is_active) {
      return { email: user.email, role: 'INACTIVE', regionName: null, churchName: null }
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

export async function getSystemUsers(): Promise<SystemUser[]> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    
    if (!dbUser || !isNationalLevel(dbUser.role)) {
      return []
    }

    const users = await prisma.user.findMany({
      include: {
        region: true,
        church: true,
      },
      orderBy: { created_at: 'desc' }
    })

    const isViewerSystemAdmin = dbUser.role === 'SYSTEM_ADMIN'
    const filteredUsers = isViewerSystemAdmin 
      ? users 
      : users.filter(u => !isProtectedUser(u.id))

    return filteredUsers.map(u => ({
      id: u.id,
      email: u.email,
      role: u.role,
      regionName: u.region?.name || null,
      churchName: u.church?.church_name || null,
      createdAt: u.created_at.toISOString(),
      isActive: u.is_active,
      requiresPasswordReset: u.requires_password_reset,
    }))

  } catch (error) {
    console.error('Failed to fetch system users:', error)
    return []
  }
}

export async function inviteUser(formData: FormData) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }
    
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (!dbUser || !isNationalLevel(dbUser.role)) {
      return { error: 'Unauthorized. Only National HQ can invite users.' }
    }

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const region_id = (formData.get('region_id') as string) || null
    const church_id = (formData.get('church_id') as string) || null

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

    try {
      await prisma.user.create({
        data: {
          id: authData.user.id,
          email,
          role,
          region_id,
          church_id
        }
      })
    } catch (dbError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw dbError
    }

    // Audit: only written after successful Auth + Prisma creation
    await logAudit({
      action: 'USER_INVITED',
      entity: 'User',
      entityId: authData.user.id,
      beforeData: null,
      afterData: { email, role, region_id, church_id },
      metadata: { invited_by_role: dbUser.role },
    })

    revalidatePath('/dashboard/users')
    return { success: true }

  } catch (error) {
    console.error('Invite error:', error)
    
    if (
      typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002'
    ) {
      return { error: 'A user with this email or ID already exists in the database.' }
    }
    
    const message = error instanceof Error ? error.message : 'Failed to invite user'
    return { error: message }
  }
}

export async function toggleUserStatus(targetUserId: string, isActive: boolean) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }
    
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (!dbUser || !isNationalLevel(dbUser.role)) {
      return { error: 'Unauthorized. Only National HQ can modify users.' }
    }

    if (isProtectedUser(targetUserId)) {
      return { error: 'Cannot modify a protected system account.' }
    }

    const beforeUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { is_active: true, email: true, role: true }
    })

    if (!beforeUser) return { error: 'User not found.' }

    await prisma.user.update({
      where: { id: targetUserId },
      data: { is_active: isActive }
    })

    await logAudit({
      action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      entity: 'User',
      entityId: targetUserId,
      beforeData: { is_active: beforeUser.is_active },
      afterData: { is_active: isActive },
      metadata: { target_email: beforeUser.email, target_role: beforeUser.role },
    })

    revalidatePath('/dashboard/users')
    return { success: true }
  } catch (error) {
    console.error('Toggle user status error:', error)
    return { error: 'Failed to update user status.' }
  }
}

export async function forcePasswordReset(targetUserId: string, origin: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }
    
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (!dbUser || !isNationalLevel(dbUser.role)) {
      return { error: 'Unauthorized. Only National HQ can modify users.' }
    }

    if (isProtectedUser(targetUserId)) {
      return { error: 'Cannot modify a protected system account.' }
    }

    const beforeUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { requires_password_reset: true, email: true, role: true }
    })
    if (!beforeUser) return { error: 'User not found.' }

    // Set the flag (this is the real safety net)
    await prisma.user.update({
      where: { id: targetUserId },
      data: { requires_password_reset: true }
    })

    // Try to email them (best-effort). Flag is what actually enforces the reset.
    let emailSent = false
    try {
      const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const { error: emailError } = await supabaseAdmin.auth.resetPasswordForEmail(beforeUser.email, {
        redirectTo: `${origin}/login/update-password`,
      })
      if (emailError) {
        console.error('Password reset email failed:', emailError)
      } else {
        emailSent = true
      }
    } catch (emailErr) {
      console.error('Password reset email exception:', emailErr)
    }

    await logAudit({
      action: 'PASSWORD_RESET_FORCED',
      entity: 'User',
      entityId: targetUserId,
      beforeData: { requires_password_reset: beforeUser.requires_password_reset },
      afterData: { requires_password_reset: true },
      metadata: {
        target_email: beforeUser.email,
        target_role: beforeUser.role,
        email_sent: emailSent,
      },
    })

    revalidatePath('/dashboard/users')

    if (!emailSent) {
      return {
        success: true,
        warning: 'Flag set, but email could not be sent. User will still be forced to reset on next login.',
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Force password reset error:', error)
    return { error: 'Failed to force password reset.' }
  }
}

export async function clearPasswordResetFlag() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false }

    const result = await prisma.user.updateMany({
      where: { id: user.id, requires_password_reset: true },
      data: { requires_password_reset: false },
    })

    await logAudit({
      action: 'PASSWORD_CHANGED',
      entity: 'User',
      entityId: user.id,
      beforeData: null,
      afterData: null,
      metadata: {
        method: 'recovery-email',
        was_forced: result.count > 0,
      },
    })

    return { success: true }
  } catch (error) {
    console.error('Clear reset flag error:', error)
    return { success: false }
  }
}

export async function updatePasswordAndClearFlag(newPassword: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    if (newPassword.length < 6) {
      return { error: 'Password must be at least 6 characters.' }
    }

    const { error: authError } = await supabase.auth.updateUser({ password: newPassword })
    if (authError) return { error: authError.message }

    await prisma.user.updateMany({
      where: { id: user.id, requires_password_reset: true },
      data: { requires_password_reset: false },
    })

    await logAudit({
      action: 'PASSWORD_CHANGED',
      entity: 'User',
      entityId: user.id,
      beforeData: null,
      afterData: null,
      metadata: { method: 'forced-reset-page' },
    })

    return { success: true }
  } catch (error) {
    console.error('Password update error:', error)
    return { error: 'Failed to update password.' }
  }
}

export async function updateUserRole(targetUserId: string, newRole: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }
    
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (!dbUser || !isNationalLevel(dbUser.role)) {
      return { error: 'Unauthorized. Only National HQ can modify users.' }
    }

    if (isProtectedUser(targetUserId)) {
      return { error: 'Cannot modify a protected system account.' }
    }

    const roleParsed = roleSchema.safeParse(newRole)
    if (!roleParsed.success) {
      return { error: 'Invalid role selected.' }
    }

    const beforeUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { role: true, email: true }
    })
    if (!beforeUser) return { error: 'User not found.' }

    await prisma.user.update({
      where: { id: targetUserId },
      data: { role: roleParsed.data }
    })

    await logAudit({
      action: 'USER_ROLE_CHANGED',
      entity: 'User',
      entityId: targetUserId,
      beforeData: { role: beforeUser.role },
      afterData: { role: roleParsed.data },
      metadata: { target_email: beforeUser.email },
    })

    revalidatePath('/dashboard/users')
    return { success: true }
  } catch (error) {
    console.error('Update user role error:', error)
    return { error: 'Failed to update user role.' }
  }
}