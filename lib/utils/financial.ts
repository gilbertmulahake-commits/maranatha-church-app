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

// ============================================================================
// UNIT 18.2: COMPLIANCE RULE (single source of truth)
// ============================================================================

export type ChurchComplianceInput = {
  created_at: Date
  payments: Array<{
    amount_paid: number | string | { toString(): string }
    payment_type: string
    allocations: Array<{
      amount: number | string | { toString(): string }
      allocation_type: string
    }>
  }>
}

export type ChurchComplianceResult = {
  compliant: boolean
  annualStatus: 'Paid' | 'Partial' | 'Overdue'
  monthlyStatus: 'Paid' | 'Partial' | 'Overdue'
  annualPaid: number
  monthlyPaid: number
  expectedAnnual: number
  expectedMonthly: number
}

/**
 * Strict Bucket Isolation compliance rule. A church is compliant only when
 * BOTH the Annual and Monthly buckets are Paid. Shared by the scoring engine
 * (`scoring-actions.ts`) and the Compliance report — one implementation.
 */
export function isChurchCompliant(
  church: ChurchComplianceInput,
  now: Date = new Date()
): ChurchComplianceResult {
  let annualPaid = 0
  let monthlyPaid = 0

  church.payments.forEach((p) => {
    if (p.allocations.length === 0) {
      const amount = Number(p.amount_paid)
      if (p.payment_type === 'Annual') annualPaid += amount
      else monthlyPaid += amount
    } else {
      p.allocations.forEach((a) => {
        const amount = Number(a.amount)
        if (a.allocation_type === 'Annual') annualPaid += amount
        else monthlyPaid += amount
      })
    }
  })

  const { expectedAnnual, expectedMonthly } = getExpectedUpToDate(church.created_at, now)
  const annualStatus = getPeriodStatus(annualPaid, expectedAnnual)
  const monthlyStatus = getPeriodStatus(monthlyPaid, expectedMonthly)

  return {
    compliant: annualStatus === 'Paid' && monthlyStatus === 'Paid',
    annualStatus,
    monthlyStatus,
    annualPaid,
    monthlyPaid,
    expectedAnnual,
    expectedMonthly,
  }
}


// ============================================================================
// UNIT 18.2.2a: ARREARS AGING (single source of truth)
// ============================================================================

export type AgingChurchInput = {
  created_at: Date
  is_defunct: boolean
  payments: Array<{
    amount_paid: number | string | { toString(): string }
    payment_type: string
    payment_date: Date
    allocations: Array<{
      amount: number | string | { toString(): string }
      allocation_type: string
    }>
  }>
  write_offs: Array<{
    amount: number | string | { toString(): string }
    status?: string
  }>
}

export type AgingBuckets = {
  bucket0_30: number
  bucket31_60: number
  bucket61_90: number
  bucket90_plus: number
}

/**
 * Aging buckets for a church.
 *
 * 'Combined' reproduces the National dashboard's aggregate aging math
 * exactly (Annual + Monthly combined at each cutoff, FIFO write-off
 * reduction applied — oldest debt reduced first).
 *
 * 'Annual' and 'Monthly' return GROSS per-ledger buckets — no write-off
 * reduction — because WriteOff has no ledger attribution (see Unit
 * 18.2.2a spec § Design). Net Recoverable per church remains in
 * getArrearsReport().
 */
export function getAgingBuckets(
  church: AgingChurchInput,
  ledger: 'Annual' | 'Monthly' | 'Combined',
  now: Date = new Date()
): AgingBuckets {
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(now.getDate() - 30)
  const sixtyDaysAgo = new Date(now)
  sixtyDaysAgo.setDate(now.getDate() - 60)
  const ninetyDaysAgo = new Date(now)
  ninetyDaysAgo.setDate(now.getDate() - 90)

  const expToday = getExpectedUpToDate(church.created_at, now)
  const exp30 = getExpectedUpToDate(church.created_at, thirtyDaysAgo)
  const exp60 = getExpectedUpToDate(church.created_at, sixtyDaysAgo)
  const exp90 = getExpectedUpToDate(church.created_at, ninetyDaysAgo)

  const pick = (snap: {
    expectedAnnual: number
    expectedMonthly: number
    totalExpected: number
  }): number => {
    if (ledger === 'Annual') return snap.expectedAnnual
    if (ledger === 'Monthly') return snap.expectedMonthly
    return snap.totalExpected
  }

  const expectedToday = pick(expToday)
  const e30 = pick(exp30)
  const e60 = pick(exp60)
  const e90 = pick(exp90)

  let paidToday = 0
  let paid30 = 0
  let paid60 = 0
  let paid90 = 0

  church.payments.forEach((p) => {
    const pDate = new Date(p.payment_date)
    let amountForLedger = 0

    if (ledger === 'Combined') {
      amountForLedger = Number(p.amount_paid)
    } else if (p.allocations.length === 0) {
      if (p.payment_type === ledger) {
        amountForLedger = Number(p.amount_paid)
      }
    } else {
      p.allocations.forEach((a) => {
        if (a.allocation_type === ledger) {
          amountForLedger += Number(a.amount)
        }
      })
    }

    paidToday += amountForLedger
    if (pDate <= thirtyDaysAgo) paid30 += amountForLedger
    if (pDate <= sixtyDaysAgo) paid60 += amountForLedger
    if (pDate <= ninetyDaysAgo) paid90 += amountForLedger
  })

  const unpaidToday = Math.max(0, expectedToday - paidToday)
  const unpaid30 = Math.max(0, e30 - paid30)
  const unpaid60 = Math.max(0, e60 - paid60)
  const unpaid90 = Math.max(0, e90 - paid90)

  let bucket90plus = unpaid90
  let bucket61to90 = Math.max(0, unpaid60 - unpaid90)
  let bucket31to60 = Math.max(0, unpaid30 - unpaid60)
  let bucket0to30 = Math.max(0, unpaidToday - unpaid30)

  if (ledger === 'Combined') {
    // FIFO reduction — oldest debt first (90+ shrinks before 0-30).
    const writtenOff = sumApprovedWriteOffs(church.write_offs)
    let remainingWriteOff = writtenOff
    const reduce = (bucket: number) => {
      if (remainingWriteOff <= 0) return bucket
      const reduction = Math.min(bucket, remainingWriteOff)
      remainingWriteOff -= reduction
      return bucket - reduction
    }
    bucket90plus = reduce(bucket90plus)
    bucket61to90 = reduce(bucket61to90)
    bucket31to60 = reduce(bucket31to60)
    bucket0to30 = reduce(bucket0to30)
  }

  return {
    bucket0_30: bucket0to30,
    bucket31_60: bucket31to60,
    bucket61_90: bucket61to90,
    bucket90_plus: bucket90plus,
  }
}