import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { isOperationsAdmin, isFinanceAdmin } from '@/lib/auth/roles'
import type { Role } from '@prisma/client'

export async function verifyOperationsAccess() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  if (!dbUser) throw new Error('User not found')

  // Only Operations Admins or National Treasurers can modify the registry
  const allowed = isOperationsAdmin(dbUser.role) || dbUser.role === 'NATIONAL_TREASURER'
  if (!allowed) {
    throw new Error('Forbidden: Requires Operations Admin or National Treasurer privileges')
  }
  return { actorId: user.id, actorEmail: user.email, actorRole: dbUser.role }
}

export async function verifyFinanceAccess() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  if (!dbUser) throw new Error('User not found')

  // Only Finance Admins or National Treasurers can modify payments
  const allowed = isFinanceAdmin(dbUser.role) || dbUser.role === 'NATIONAL_TREASURER'
  if (!allowed) {
    throw new Error('Forbidden: Requires Finance Admin or National Treasurer privileges')
  }
  return { actorId: user.id, actorEmail: user.email, actorRole: dbUser.role }
}

export async function verifyReconciliationAccess() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  if (!dbUser) throw new Error('User not found')

  // Only Finance Admins, National Treasurers, or System Admins can access reconciliation
  const allowed =
    isFinanceAdmin(dbUser.role) || dbUser.role === 'NATIONAL_TREASURER' || dbUser.role === 'SYSTEM_ADMIN'
  if (!allowed) {
    throw new Error('Forbidden: Requires Finance Admin, Treasurer, or System Admin privileges')
  }
  return { actorId: user.id, actorEmail: user.email, actorRole: dbUser.role }
}

export async function verifyTreasurerAuthority() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  if (!dbUser) throw new Error('User not found')

  // Only National Treasurer or System Admin — used for approvals and write-offs
  const allowed =
    dbUser.role === 'NATIONAL_TREASURER' || dbUser.role === 'SYSTEM_ADMIN'
  if (!allowed) {
    throw new Error('Forbidden: Requires National Treasurer or System Admin authority')
  }
  return { actorId: user.id, actorEmail: user.email, actorRole: dbUser.role }
}

export async function verifyReportsAccess() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  if (!dbUser) throw new Error('User not found')

  // All authenticated roles can access reports. 
  // Strict scoping is enforced by buildChurchWhere() / buildPaymentWhere() and RLS.
  return { actorId: user.id, actorEmail: user.email, actorRole: dbUser.role, dbUser }
}


const CHURCH_SCOPED_ROLES: Role[] = ['CHURCH_TREASURER', 'LOCAL_PASTOR']
const FINANCE_ROLES: Role[] = ['FINANCE_ADMIN', 'NATIONAL_TREASURER', 'SYSTEM_ADMIN']

/**
 * Guard for the guided payment flow (Unit 19).
 * Finance-level roles may act on behalf of any church (assist-by-phone).
 * Church-scoped roles may only act on their own church.
 */
export async function verifyChurchPaymentAccess(churchId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  if (!dbUser) throw new Error('User not found')

  if (FINANCE_ROLES.includes(dbUser.role)) {
    return { actorId: user.id, actorEmail: user.email, actorRole: dbUser.role, dbUser }
  }
  if (CHURCH_SCOPED_ROLES.includes(dbUser.role) && dbUser.church_id === churchId) {
    return { actorId: user.id, actorEmail: user.email, actorRole: dbUser.role, dbUser }
  }
  throw new Error('Forbidden: Requires church-scoped or finance-level access')
}