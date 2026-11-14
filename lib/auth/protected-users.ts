/**
 * Protected User Accounts (SYSTEM_ADMIN)
 *
 * This module provides the hardcoded allowlist of user IDs that are immune
 * to UI-level mutation (delete, deactivate, role-change).
 *
 * Why hardcoded?
 * - Client users (including NATIONAL_TREASURER) must NEVER be able to modify
 *   the vendor's account, even if they somehow gain admin access.
 * - A database flag could be flipped by a rogue script or SQL injection.
 *   A compiled-in allowlist cannot.
 *
 * Security rules:
 * - This array must ONLY contain UUIDs of vendor/platform-owner accounts.
 * - Any server action that mutates a User MUST call `isProtectedUser(targetId)`
 *   as the very first step and reject the operation if it returns true.
 * - `getSystemUsers` must filter protected users out of the list unless the
 *   viewer is themselves a SYSTEM_ADMIN.
 */

export const PROTECTED_USER_IDS: string[] = [
  // Vendor UUIDs (SYSTEM_ADMIN accounts cannot be deleted/deactivated via UI)
  '86f0852b-23f2-4a32-a478-4e7b096f792d',
]

/**
 * Returns true if the given user ID is in the protected allowlist.
 * Case-insensitive comparison since UUIDs may come in varying casing.
 */
export function isProtectedUser(userId: string | null | undefined): boolean {
  if (!userId) return false
  const normalized = userId.toLowerCase()
  return PROTECTED_USER_IDS.some(id => id.toLowerCase() === normalized)
}