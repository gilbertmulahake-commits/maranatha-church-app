export const ANNUAL_FEE = 5000
export const MONTHLY_FEE = 500

/**
 * Calculates the cumulative expected amount owed by a church from a start date.
 */
export function getExpectedUpToDate(startDate: Date, upToDate: Date = new Date()) {
  let expectedAnnual = 0
  let expectedMonthly = 0

  if (startDate > upToDate) {
    return { expectedAnnual: 0, expectedMonthly: 0, totalExpected: 0 }
  }

  let currentYear = startDate.getFullYear()
  const endYear = upToDate.getFullYear()

  while (currentYear <= endYear) {
    const isStartYear = currentYear === startDate.getFullYear()
    const isEndYear = currentYear === endYear

    // --- 1. Annual Fee (Due after March) ---
    if (isStartYear) {
      if (startDate.getMonth() <= 2) expectedAnnual += ANNUAL_FEE
    } else {
      expectedAnnual += ANNUAL_FEE
    }

    // --- 2. Monthly Fee ---
    let startMonth = 0
    let endMonth = 11

    if (isStartYear) startMonth = startDate.getMonth()
    if (isEndYear) endMonth = upToDate.getMonth()

    const monthsInYear = endMonth - startMonth + 1
    if (monthsInYear > 0) {
      expectedMonthly += (monthsInYear * MONTHLY_FEE)
    }

    currentYear++
  }

  return {
    expectedAnnual,
    expectedMonthly,
    totalExpected: expectedAnnual + expectedMonthly
  }
}

/**
 * Calculates the status of a specific fee stream (Annual or Monthly).
 */
export function getPeriodStatus(
  paid: number, 
  expected: number
): 'Paid' | 'Partial' | 'Overdue' {
  if (paid >= expected) return 'Paid'
  if (paid > 0) return 'Partial'
  if (expected > 0) return 'Overdue'
  return 'Partial'
}

/**
 * Calculates the credit balance (overpayment).
 */
export function getCreditBalance(totalPaid: number, expectedToDate: number): number {
  return Math.max(0, totalPaid - expectedToDate)
}

// ============================================================================
// UNIT 17: WRITE-OFFS & DEFUNCT CHURCH HANDLING
// ============================================================================

/**
 * Net Outstanding (after write-offs).
 * 
 * Write-offs do NOT reduce the historical expectation — the obligation
 * truly existed. They reduce what we can still collect. This helper
 * returns gross - writtenOff, floored at zero.
 * 
 * Use this in every financial report per IFRS 9 / IPSAS 29:
 *   Gross Arrears:        KES X
 *   Less: Written Off:   (KES Y)
 *   Net Recoverable:      KES Z
 */
export function getNetOutstanding(
  grossOutstanding: number,
  writtenOffAmount: number
): number {
  return Math.max(0, grossOutstanding - writtenOffAmount)
}

/**
 * Filters out defunct churches.
 * 
 * Defunct churches are excluded from:
 *   - Compliance percentage denominators
 *   - Regional incentive scoring
 *   - SMS reminder lists
 * 
 * They remain visible in financial reports (gross arrears, write-off register).
 */
export function isActiveChurch(
  church: { is_defunct?: boolean | null }
): boolean {
  return !church.is_defunct
}

export function filterActiveChurches<
  T extends { is_defunct?: boolean | null }
>(churches: T[]): T[] {
  return churches.filter(isActiveChurch)
}

/**
 * Sums the total written-off amount.
 * 
 * Accepts either:
 *   - A pre-filtered list (status already = 'Approved' from a Prisma where clause)
 *   - An unfiltered list (only status = 'Approved' rows are counted)
 * 
 * Handles Prisma.Decimal amounts via Number() coercion.
 */
export function sumApprovedWriteOffs(
  writeOffs:
    | Array<{ amount: number | string | { toString(): string }; status?: string }>
    | null
    | undefined
): number {
  if (!writeOffs || writeOffs.length === 0) return 0
  return writeOffs
    .filter((w) => !w.status || w.status === 'Approved')
    .reduce((sum, w) => sum + Number(w.amount), 0)
}