import { Role } from '@prisma/client'

// 🛡️ Centralized role groupings. 
// Use these arrays instead of hardcoded string checks (e.g., role === 'NATIONAL_TREASURER').

export const NATIONAL_ROLES: Role[] = [
  'SYSTEM_ADMIN',
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