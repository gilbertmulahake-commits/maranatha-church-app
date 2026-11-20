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


// Payment Intent (Unit 19) — guided wizard lifecycle
export const PAYMENT_INTENT_EXPIRY_MINUTES = 30
export const PAYMENT_INTENT_POLL_INTERVAL_MS = 5000
export const PAYMENT_INTENT_GRACE_SECONDS = 60
export const PAYMENT_INTENT_AMOUNT_CEILING = 500_000