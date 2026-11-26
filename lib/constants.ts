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


// Per-church contribution obligations. Relocated from lib/utils/financial.ts
// (Unit 20.7). Single source of truth — every ledger calculation, help string,
// and system-config row reads these. Never inline 5000 or 500 anywhere.
export const ANNUAL_FEE = 5000
export const MONTHLY_FEE = 500

// 1-indexed month. Churches created on or before March owe the current year's
// annual fee; churches created in April or later begin owing the following
// year. Reads as plain English ("March") — do NOT convert to a 0-indexed JS
// month. The comparison site handles the `+ 1` shift.
export const ANNUAL_FEE_DUE_THROUGH_MONTH = 3

// SLA Limits for Unmatched Payments
export const SLA_YELLOW_DAYS = 7
export const SLA_RED_DAYS = 30

// SLA Limits for Church Deletion Approval Queue (Unit 20.6b)
// Different domain from reconciliation: a two-role approval cycle should be
// resolved within a business week, not a month. Do NOT merge with
// SLA_YELLOW_DAYS — reconciliation aging measures money-in-limbo; deletion
// aging measures approval throughput. Single source of truth per domain.
export const CHURCH_DELETION_SLA_YELLOW_DAYS = 3
export const CHURCH_DELETION_SLA_RED_DAYS = 7


// Payment Intent (Unit 19) — guided wizard lifecycle
export const PAYMENT_INTENT_EXPIRY_MINUTES = 30
export const PAYMENT_INTENT_POLL_INTERVAL_MS = 5000
export const PAYMENT_INTENT_GRACE_SECONDS = 60
export const PAYMENT_INTENT_AMOUNT_CEILING = 500_000