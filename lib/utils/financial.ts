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