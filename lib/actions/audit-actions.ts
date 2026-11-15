'use server'

import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export type AuditPayload = {
  action: string        // e.g., 'USER_DEACTIVATED', 'CHURCH_UPDATED'
  entity: string        // e.g., 'User', 'Church'
  entityId: string
  beforeData?: Record<string, unknown> | null
  afterData?: Record<string, unknown> | null
  metadata?: Record<string, unknown> | null
}

/**
 * Centralized audit logger.
 * 
 * CRITICAL INVARIANT: This function catches ALL errors internally.
 * An audit log failure must NEVER roll back the main transaction 
 * (e.g., if we are saving a payment, the payment must succeed even if logging fails).
 */
export async function logAudit(payload: AuditPayload) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user || !user.email) return

    // Get the actor's role from the DB to ensure accuracy
    const dbUser = await prisma.user.findUnique({ 
      where: { id: user.id },
      select: { role: true }
    })
    
    if (!dbUser) return

    await prisma.auditLog.create({
      data: {
        actor_id: user.id,
        actor_email: user.email,
        actor_role: dbUser.role,
        action: payload.action,
        entity: payload.entity,
        entity_id: payload.entityId,
        // Prisma requires serializing unknown JSON payloads
        before_data: payload.beforeData ? JSON.parse(JSON.stringify(payload.beforeData)) : undefined,
        after_data: payload.afterData ? JSON.parse(JSON.stringify(payload.afterData)) : undefined,
        metadata: payload.metadata ? JSON.parse(JSON.stringify(payload.metadata)) : undefined,
      }
    })
  } catch (error) {
    // Swallow error to protect the main transaction
    console.error('Failed to write audit log:', error)
  }
}