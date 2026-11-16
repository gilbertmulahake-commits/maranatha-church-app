// lib/constants.ts

/**
 * Financial and Operational business rules for Maranatha Church System.
 * Centralized here to prevent magic numbers and ensure consistency
 * across server actions, UI components, and validation schemas.
 */

// Any payment or resolution above this amount requires a second approver (Four-Eyes)
export const FOUR_EYES_THRESHOLD = 20000

// Default Prisma transaction timeout (15 seconds)
export const PRISMA_TRANSACTION_TIMEOUT = 15000

// The age (in days) at which an outstanding balance is considered critical arrears
export const ARREARS_CRITICAL_DAYS = 90

// SLA Limits for Unmatched Payments
export const SLA_YELLOW_DAYS = 7
export const SLA_RED_DAYS = 30