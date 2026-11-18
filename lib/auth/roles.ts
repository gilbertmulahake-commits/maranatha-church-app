import { Role } from '@prisma/client'

// Centralized role groupings. 
// Use these arrays instead of hardcoded string checks (e.g., role === 'NATIONAL_TREASURER').

export const NATIONAL_ROLES: Role[] = [
  'SYSTEM_ADMIN',
  'FINANCE_ADMIN',
  'OPERATIONS_ADMIN',
  'NATIONAL_TREASURER',
  'NATIONAL_OVERSEER'
]

export const REGIONAL_ROLES: Role[] = [
  'REGIONAL_CHAIRMAN',
  'REGIONAL_TREASURER'
]

export const LOCAL_ROLES: Role[] = [
  'LOCAL_PASTOR',
  'CHURCH_TREASURER'
]

// Helper functions for readable guards
export function isSystemAdmin(role: Role | string | null | undefined): boolean {
  return role === 'SYSTEM_ADMIN'
}

export function isNationalLevel(role: Role | string | null | undefined): boolean {
  return !!role && NATIONAL_ROLES.includes(role as Role)
}

export function isRegionalLevel(role: Role | string | null | undefined): boolean {
  return !!role && REGIONAL_ROLES.includes(role as Role)
}

export function isLocalLevel(role: Role | string | null | undefined): boolean {
  return !!role && LOCAL_ROLES.includes(role as Role)
}

// New Separation of Duties Helpers
export function isFinanceAdmin(role: Role | string | null | undefined): boolean {
  return role === 'FINANCE_ADMIN' || role === 'SYSTEM_ADMIN'
}

export function isOperationsAdmin(role: Role | string | null | undefined): boolean {
  return role === 'OPERATIONS_ADMIN' || role === 'SYSTEM_ADMIN'
}

// Report-layer role mapping. Returns the report visibility bucket for a user.
// Never returns 'ALL' — that value exists only in the report registry's
// `visibleTo` arrays (a report visible to everyone), not as a caller identity.
export function toReportRole(
  role: Role | string | null | undefined
): 'NATIONAL' | 'REGIONAL' | 'LOCAL' {
  if (isNationalLevel(role)) return 'NATIONAL'
  if (isRegionalLevel(role)) return 'REGIONAL'
  if (isLocalLevel(role)) return 'LOCAL'
  return 'LOCAL' // least visibility — safest default for unknown/null roles
}