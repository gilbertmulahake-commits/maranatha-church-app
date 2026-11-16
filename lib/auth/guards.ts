import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { isOperationsAdmin, isFinanceAdmin } from '@/lib/auth/roles'

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
    isFinanceAdmin(dbUser.role) || dbUser.role === 'NATIONAL_TREASURER'
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