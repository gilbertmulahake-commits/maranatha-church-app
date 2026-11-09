// ============================================================================
// ALLOCATION ENGINE — Enterprise Payment Attribution
//
// Priority Order (client-approved, year-by-year future prepayment model):
//   1a. Past-year Annual arrears (oldest year first)
//   1b. Past-year Monthly arrears (oldest year first)
//   2.  Current-year Annual (due/overdue)
//   3.  Current-year Monthly arrears (past months of this year)
//   4.  Current month's Monthly
//   5.  Current-year remaining Monthly (future months of this year)
//   6+. Future years, one complete year at a time:
//         Annual Y → 12 × Monthly Y (Jan-Dec) → Annual Y+1 → ...
//
// Rationale: Annual is due by March 31 each year, so it's always time-critical.
// Grouping future prepayment "year by year" matches how a church thinks about
// each annual cycle and ensures no year is partially funded.
// ============================================================================

const ANNUAL_FEE = 5000
const MONTHLY_FEE = 500

export type ExpectedPeriod = {
  year: number
  month?: number
  expected: number
  paid: number
}

export type AllocationRecord = {
  allocation_type: 'Annual' | 'Monthly'
  billing_year: number
  billing_month: number | null
  amount: number
}

/**
 * Computes every Annual and Monthly period that SHOULD have been paid
 * from the church's creation date up to `now`.
 */
export function computeExpectedPeriods(
  churchCreatedAt: Date,
  existingAllocations: {
    allocation_type: string
    billing_year: number
    billing_month: number | null
    amount: number
  }[],
  now: Date = new Date()
): { expectedAnnuals: ExpectedPeriod[]; expectedMonthlies: ExpectedPeriod[] } {
  const expectedAnnuals: ExpectedPeriod[] = []
  const expectedMonthlies: ExpectedPeriod[] = []

  const startYear = churchCreatedAt.getFullYear()
  const endYear = now.getFullYear()

  for (let year = startYear; year <= endYear; year++) {
    const isStartYear = year === startYear
    const annualApplies = isStartYear ? churchCreatedAt.getMonth() <= 2 : true

    if (annualApplies) {
      const annualPaid = existingAllocations
        .filter((a) => a.allocation_type === 'Annual' && a.billing_year === year)
        .reduce((sum, a) => sum + Number(a.amount), 0)
      expectedAnnuals.push({ year, expected: ANNUAL_FEE, paid: annualPaid })
    }

    const startMonth = isStartYear ? churchCreatedAt.getMonth() : 0
    const endMonth = year === endYear ? now.getMonth() : 11

    for (let month = startMonth; month <= endMonth; month++) {
      const monthNum = month + 1
      const monthlyPaid = existingAllocations
        .filter(
          (a) =>
            a.allocation_type === 'Monthly' &&
            a.billing_year === year &&
            a.billing_month === monthNum
        )
        .reduce((sum, a) => sum + Number(a.amount), 0)
      expectedMonthlies.push({
        year,
        month: monthNum,
        expected: MONTHLY_FEE,
        paid: monthlyPaid,
      })
    }
  }

  return { expectedAnnuals, expectedMonthlies }
}

/**
 * Distributes a total payment amount across expected periods.
 * See file header for the priority order.
 */
export function calculateAllocations(
  totalAmount: number,
  expectedAnnuals: ExpectedPeriod[],
  expectedMonthlies: ExpectedPeriod[],
  now: Date = new Date()
): AllocationRecord[] {
  let remaining = totalAmount
  const allocations: AllocationRecord[] = []
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  // Helper to push an allocation if there's budget
  const tryAllocate = (
    type: 'Annual' | 'Monthly',
    year: number,
    month: number | null,
    outstanding: number
  ) => {
    if (remaining <= 0 || outstanding <= 0) return
    const toAllocate = Math.min(remaining, outstanding)
    allocations.push({
      allocation_type: type,
      billing_year: year,
      billing_month: month,
      amount: toAllocate,
    })
    remaining -= toAllocate
  }

  // ── Priority 1a: Past-year Annual (oldest first) ─────────────────────────
  expectedAnnuals
    .filter((p) => p.year < currentYear)
    .forEach((p) => tryAllocate('Annual', p.year, null, p.expected - p.paid))

  // ── Priority 1b: Past-year Monthly (oldest first) ────────────────────────
  expectedMonthlies
    .filter((p) => p.year < currentYear)
    .sort((a, b) => a.year - b.year || (a.month ?? 0) - (b.month ?? 0))
    .forEach((p) => tryAllocate('Monthly', p.year, p.month!, p.expected - p.paid))

  // ── Priority 2: Current-year Annual ──────────────────────────────────────
  expectedAnnuals
    .filter((p) => p.year === currentYear)
    .forEach((p) => tryAllocate('Annual', p.year, null, p.expected - p.paid))

  // ── Priority 3: Current-year Monthly arrears (months < current month) ────
  expectedMonthlies
    .filter((p) => p.year === currentYear && (p.month ?? 0) < currentMonth)
    .sort((a, b) => (a.month ?? 0) - (b.month ?? 0))
    .forEach((p) => tryAllocate('Monthly', p.year, p.month!, p.expected - p.paid))

  // ── Priority 4: Current month ────────────────────────────────────────────
  expectedMonthlies
    .filter((p) => p.year === currentYear && p.month === currentMonth)
    .forEach((p) => tryAllocate('Monthly', p.year, p.month!, p.expected - p.paid))

  // ── Priority 5: Rest of current year (future months) ─────────────────────
  for (let m = currentMonth + 1; m <= 12 && remaining > 0; m++) {
    tryAllocate('Monthly', currentYear, m, MONTHLY_FEE)
  }

  // ── Priority 6+: Future years, one complete cycle at a time ──────────────
  let futureYear = currentYear + 1
  while (remaining > 0) {
    // 6a: Future Annual
    tryAllocate('Annual', futureYear, null, ANNUAL_FEE)

    // 6b: All 12 months of that year
    for (let m = 1; m <= 12 && remaining > 0; m++) {
      tryAllocate('Monthly', futureYear, m, MONTHLY_FEE)
    }

    futureYear += 1

    // Safety: prevent infinite loop if something goes wrong
    if (futureYear > currentYear + 50) break
  }

  return allocations
}