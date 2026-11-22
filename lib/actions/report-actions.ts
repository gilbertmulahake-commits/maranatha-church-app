'use server'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { verifyReportsAccess } from '@/lib/auth/guards'
import { buildChurchWhere, buildPaymentWhere } from '@/lib/utils/report-scope'
import { getExpectedUpToDate, sumApprovedWriteOffs, getNetOutstanding, getAgingBuckets, getCreditPosition, type AgingBuckets } from '@/lib/utils/financial'
import { isNationalLevel } from '@/lib/auth/roles'
import { isChurchCompliant } from '@/lib/utils/financial'
import { scopeByRole } from '@/lib/utils/report-scope'
import { getRegionalScores, type RegionalScoreData } from '@/lib/actions/scoring-actions'

export type ArrearsRow = {
  id: string
  church_code: string
  church_name: string
  region_name: string
  contact_phone: string
  is_defunct: boolean
  grossAnnual: number
  grossMonthly: number
  grossTotal: number
  writtenOff: number
  netTotal: number
}

export async function getArrearsReport(): Promise<ArrearsRow[]> {
  try {
    const { dbUser } = await verifyReportsAccess()
    const churchWhere = buildChurchWhere(dbUser)

    const churches = await prisma.church.findMany({
      where: churchWhere,
      include: {
        region: true,
        payments: { 
          where: { status: 'Paid' },
          include: { allocations: true }
        },
        write_offs: {
          where: { status: 'Approved' }
        }
      },
      orderBy: { church_code: 'asc' },
    })

    const now = new Date()
    const arrearsData: ArrearsRow[] = []

    churches.forEach((church) => {
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

      const grossAnnual = Math.max(0, expectedAnnual - annualPaid)
      const grossMonthly = Math.max(0, expectedMonthly - monthlyPaid)
      const grossTotal = grossAnnual + grossMonthly

      const writtenOff = sumApprovedWriteOffs(church.write_offs)
      const netTotal = getNetOutstanding(grossTotal, writtenOff)

      if (grossTotal > 0 || writtenOff > 0) {
        arrearsData.push({
          id: church.id,
          church_code: church.church_code,
          church_name: church.church_name,
          region_name: church.region.name,
          contact_phone: church.contact_phone,
          is_defunct: church.is_defunct,
          grossAnnual,
          grossMonthly,
          grossTotal,
          writtenOff,
          netTotal,
        })
      }
    })

    return arrearsData.sort((a, b) => b.netTotal - a.netTotal)

  } catch (error) {
    console.error('Failed to fetch arrears report:', error)
    return []
  }
}

export type CashbookRow = {
  id: string
  transaction_id: string
  church_code: string
  church_name: string
  amount_paid: number
  payment_type: string
  payment_method: string
  payment_date: string
  source: string
}

export async function getDailyCashbook(targetDate: Date): Promise<CashbookRow[]> {
  try {
    const { dbUser } = await verifyReportsAccess()
    const paymentWhere = buildPaymentWhere(dbUser)

    const startOfDay = new Date(targetDate)
    startOfDay.setHours(0, 0, 0, 0)
    
    const endOfDay = new Date(targetDate)
    endOfDay.setHours(23, 59, 59, 999)

    const whereClause: Prisma.PaymentWhereInput = {
      ...paymentWhere,
      payment_date: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: 'Paid',
    }

    const payments = await prisma.payment.findMany({
      where: whereClause,
      include: { church: true },
      orderBy: { payment_date: 'asc' },
    })

    return payments.map((p) => ({
      id: p.id,
      transaction_id: p.transaction_id,
      church_code: p.church.church_code,
      church_name: p.church.church_name,
      amount_paid: Number(p.amount_paid),
      payment_type: p.payment_type,
      payment_method: p.payment_method,
      payment_date: p.payment_date.toISOString(),
      source: p.source
    }))

  } catch (error) {
    console.error('Failed to fetch daily cashbook:', error)
    return []
  }
}

export type WriteOffRow = {
  id: string
  church_code: string
  church_name: string
  amount: number
  reason: string
  proposed_at: string
  approved_at: string | null
  status: string
  // Unit 20.6a: true when the church has been soft-deleted. Financial
  // disclosure registers preserve deleted churches (IFRS 9 / audit);
  // Phase B renders a `(deleted)` badge based on this flag.
  church_deleted: boolean
}

export async function getWriteOffRegister(): Promise<WriteOffRow[]> {
  try {
    const { dbUser } = await verifyReportsAccess()
    const churchWhere = buildChurchWhere(dbUser)

    // Unit 20.6a: write-off register is a financial-disclosure register
    // (IFRS 9 / IPSAS 29). Deleted churches' write-offs remain visible so
    // auditors can trace every write-off without reconstructing from the
    // audit log. Strip the soft-delete filter from the inherited scope and
    // annotate each row with `church_deleted` — the UI renders a badge in
    // Phase B (see architecture.md § 8).
    const { deleted_at: _unused_deleted_at, ...churchWhereForDisclosure } = churchWhere
    void _unused_deleted_at

    const writeOffs = await prisma.writeOff.findMany({
      where: {
        status: 'Approved',
        church: churchWhereForDisclosure
      },
      include: { church: true },
      orderBy: { approved_at: 'desc' }
    })

    return writeOffs.map(w => ({
      id: w.id,
      church_code: w.church.church_code,
      church_name: w.church.church_name,
      amount: Number(w.amount),
      reason: w.reason,
      proposed_at: w.proposed_at.toISOString(),
      approved_at: w.approved_at ? w.approved_at.toISOString() : null,
      status: w.status,
      church_deleted: w.church.deleted_at !== null,
    }))
  } catch (error) {
    console.error('Failed to fetch write-off register:', error)
    return []
  }
}

export type DefunctRow = {
  id: string
  church_code: string
  church_name: string
  region_name: string
  total_written_off: number
  date_marked_defunct: string | null
  // Unit 20.6a: true when the church has been soft-deleted. Same rationale
  // as WriteOffRow — this register carries write-off amounts, so it is a
  // disclosure register and preserves deleted churches. Phase B renders
  // a `(deleted)` badge based on this flag.
  church_deleted: boolean
}

export async function getDefunctChurchRegister(): Promise<DefunctRow[]> {
  try {
    const { dbUser } = await verifyReportsAccess()
    const churchWhere = buildChurchWhere(dbUser)

    // Unit 20.6a: defunct register carries write-off amounts, so it is a
    // financial-disclosure register. Same preservation rule as the write-off
    // register — strip the soft-delete filter and annotate rows.
    const { deleted_at: _unused_deleted_at, ...churchWhereForRegister } = churchWhere
    void _unused_deleted_at

    const churches = await prisma.church.findMany({
      where: {
        ...churchWhereForRegister,
        is_defunct: true
      },
      include: {
        region: true,
        write_offs: {
          where: { status: 'Approved' },
          orderBy: { approved_at: 'desc' }
        }
      },
      orderBy: { church_name: 'asc' }
    })

    return churches.map(c => ({
      id: c.id,
      church_code: c.church_code,
      church_name: c.church_name,
      region_name: c.region.name,
      total_written_off: sumApprovedWriteOffs(c.write_offs),
      date_marked_defunct: c.write_offs[0]?.approved_at?.toISOString() || null,
      church_deleted: c.deleted_at !== null,
    }))
  } catch (error) {
    console.error('Failed to fetch defunct register:', error)
    return []
  }
}

export type InactiveChurchRow = {
  id: string
  church_code: string
  church_name: string
  region_name: string
  last_payment_date: string | null
  days_inactive: number
}

export async function getInactiveChurches(months = 6): Promise<InactiveChurchRow[]> {
  try {
    const { dbUser } = await verifyReportsAccess()
    const churchWhere = buildChurchWhere(dbUser)

    const thresholdDate = new Date()
    thresholdDate.setMonth(thresholdDate.getMonth() - months)

    const churches = await prisma.church.findMany({
      where: {
        ...churchWhere,
        is_defunct: false,
        created_at: { lt: thresholdDate }
      },
      include: {
        region: true,
        payments: {
          where: { status: 'Paid' },
          orderBy: { payment_date: 'desc' },
          take: 1
        }
      }
    })

    const now = new Date()
    return churches
      .filter(c => {
        if (c.payments.length === 0) return true
        return c.payments[0].payment_date < thresholdDate
      })
      .map(c => {
        const lastPaymentDate = c.payments.length > 0 ? c.payments[0].payment_date : null
        const daysInactive = lastPaymentDate 
          ? Math.floor((now.getTime() - lastPaymentDate.getTime()) / (1000 * 60 * 60 * 24))
          : Math.floor((now.getTime() - c.created_at.getTime()) / (1000 * 60 * 60 * 24))

        return {
          id: c.id,
          church_code: c.church_code,
          church_name: c.church_name,
          region_name: c.region.name,
          last_payment_date: lastPaymentDate ? lastPaymentDate.toISOString() : null,
          days_inactive: daysInactive
        }
      })
      .sort((a, b) => b.days_inactive - a.days_inactive)
  } catch (error) {
    console.error('Failed to fetch inactive churches:', error)
    return []
  }
}


// ────────────────────────────────────────────────────────────────────────────
// Collections Summary (Unit 18.2, Stage A)
// Cash received by period, isolated by bucket. Period is `month` (default) or
// `year`; each row is one calendar period of `payment_date`. Cash basis — a
// payment is counted in the period it was received, not the period it settled.
// ────────────────────────────────────────────────────────────────────────────

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function formatPeriodLabel(year: number, month: number | null): string {
  if (month === null) return String(year)
  return `${MONTH_LABELS[month - 1]} ${year}`
}

export type CollectionsSummaryRow = {
  periodKey: string              // 'YYYY-MM' or 'YYYY', sortable
  year: number
  month: number | null           // null when period === 'year'
  periodLabel: string            // 'Nov 2026' or '2026'
  paymentsCount: number
  annualCollected: number
  monthlyCollected: number
  prepaymentCredit: number       // allocations with billing_year > currentYear
  totalReceived: number          // gross cash received (amount_paid sum)
}

export async function getCollectionsSummary(
  period: 'month' | 'year' = 'month',
  regionId?: string
): Promise<CollectionsSummaryRow[]> {
  try {
    const { dbUser } = await verifyReportsAccess()
    const paymentWhere = buildPaymentWhere(dbUser, regionId)

    const payments = await prisma.payment.findMany({
      where: { ...paymentWhere, status: 'Paid' },
      include: { allocations: true },
    })

    const currentYear = new Date().getFullYear()
    const byPeriod = new Map<string, CollectionsSummaryRow>()

    payments.forEach((p) => {
      const d = p.payment_date
      const year = d.getFullYear()
      const month = d.getMonth() + 1
      const monthOrNull = period === 'year' ? null : month
      const key = period === 'year'
        ? String(year)
        : `${year}-${String(month).padStart(2, '0')}`

      let row = byPeriod.get(key)
      if (!row) {
        row = {
          periodKey: key,
          year,
          month: monthOrNull,
          periodLabel: formatPeriodLabel(year, monthOrNull),
          paymentsCount: 0,
          annualCollected: 0,
          monthlyCollected: 0,
          prepaymentCredit: 0,
          totalReceived: 0,
        }
        byPeriod.set(key, row)
      }

      row.paymentsCount += 1
      row.totalReceived += Number(p.amount_paid)

      if (p.allocations.length === 0) {
        // Fallback: no allocation rows — trust the payment's own type.
        const amt = Number(p.amount_paid)
        if (p.payment_type === 'Annual') row.annualCollected += amt
        else row.monthlyCollected += amt
      } else {
        p.allocations.forEach((a) => {
          const amt = Number(a.amount)
          if (a.allocation_type === 'Annual') row.annualCollected += amt
          else row.monthlyCollected += amt
          // Prepayment: attribution to a future billing year. Combined across
          // buckets — an "of which" indicator, not a bucket of its own.
          if (a.billing_year > currentYear) row.prepaymentCredit += amt
        })
      }
    })

    return Array.from(byPeriod.values()).sort((a, b) =>
      b.periodKey.localeCompare(a.periodKey)
    )
  } catch (error) {
    console.error('Failed to fetch collections summary:', error)
    return []
  }
}


// ────────────────────────────────────────────────────────────────────────────
// Region options for report toolbar filters (Unit 18.2)
// National roles only — Regional/Local viewers see no filter (their scope
// already restricts them). Returns [] for non-National roles, so the caller
// can conditionally render the <Select> with `regions.length > 0`.
// ────────────────────────────────────────────────────────────────────────────

export type RegionOption = { id: string; name: string }

export async function getRegionOptions(): Promise<RegionOption[]> {
  try {
    const { dbUser } = await verifyReportsAccess()
    if (!isNationalLevel(dbUser.role)) return []

    return await prisma.region.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })
  } catch (error) {
    console.error('Failed to fetch region options:', error)
    return []
  }
}


// ────────────────────────────────────────────────────────────────────────────
// Compliance Report (Unit 18.2, Stage A)
// Per-church compliance using `isChurchCompliant` — never re-derives the rule.
// Includes defunct churches with badge; defunct excluded from KPI denominator
// (handled client-side).
// ────────────────────────────────────────────────────────────────────────────

export type ComplianceRow = {
  id: string
  church_code: string
  church_name: string
  region_name: string
  is_defunct: boolean
  annualStatus: 'Paid' | 'Partial' | 'Overdue'
  monthlyStatus: 'Paid' | 'Partial' | 'Overdue'
  annualPaid: number
  annualExpected: number
  monthlyPaid: number
  monthlyExpected: number
  grossOutstanding: number
  writtenOff: number
  netRecoverable: number
}

export async function getComplianceReport(): Promise<ComplianceRow[]> {
  try {
    const { dbUser } = await verifyReportsAccess()
    const churchWhere = buildChurchWhere(dbUser)

    const churches = await prisma.church.findMany({
      where: churchWhere,
      include: {
        region: true,
        payments: {
          where: { status: 'Paid' },
          include: { allocations: true },
        },
        write_offs: {
          where: { status: 'Approved' },
        },
      },
      orderBy: { church_code: 'asc' },
    })

    const now = new Date()

    return churches.map((church) => {
      const c = isChurchCompliant(church, now)
      const writtenOff = sumApprovedWriteOffs(church.write_offs)
      const grossAnnual = Math.max(0, c.expectedAnnual - c.annualPaid)
      const grossMonthly = Math.max(0, c.expectedMonthly - c.monthlyPaid)
      const grossOutstanding = grossAnnual + grossMonthly
      const netRecoverable = getNetOutstanding(grossOutstanding, writtenOff)

      return {
        id: church.id,
        church_code: church.church_code,
        church_name: church.church_name,
        region_name: church.region.name,
        is_defunct: church.is_defunct,
        annualStatus: c.annualStatus,
        monthlyStatus: c.monthlyStatus,
        annualPaid: c.annualPaid,
        annualExpected: c.expectedAnnual,
        monthlyPaid: c.monthlyPaid,
        monthlyExpected: c.expectedMonthly,
        grossOutstanding,
        writtenOff,
        netRecoverable,
      }
    })
  } catch (error) {
    console.error('Failed to fetch compliance report:', error)
    return []
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Regional Scores Report (Unit 18.2, Stage A)
// Wraps the scoring engine and applies role scoping. Rank preserved globally —
// a Regional Chairman sees their region's true rank, not "Rank 1 of 1".
// ────────────────────────────────────────────────────────────────────────────

export type RegionalScoresReportRow = RegionalScoreData & { rank: number }

export async function getRegionalScoresReport(): Promise<RegionalScoresReportRow[]> {
  try {
    const { dbUser } = await verifyReportsAccess()
    const scores = await getRegionalScores()
    return scopeByRole(scores, dbUser)
  } catch (error) {
    console.error('Failed to fetch regional scores report:', error)
    return []
  }
}


// ────────────────────────────────────────────────────────────────────────────
// YoY Comparison (Unit 18.2, Stage B)
// Cash received, calendar year of payment_date. Cash basis — prepayments count
// in the year cash arrived, not the year they satisfied.
// ────────────────────────────────────────────────────────────────────────────

export type YoYRow = {
  year: string
  annualCollected: number
  monthlyCollected: number
  annualDelta: number | null
  monthlyDelta: number | null
  annualPct: number | null
  monthlyPct: number | null
}

export async function getYoYComparison(regionId?: string): Promise<YoYRow[]> {
  try {
    const { dbUser } = await verifyReportsAccess()
    const where = buildPaymentWhere(dbUser, regionId)

    const payments = await prisma.payment.findMany({
      where: { ...where, status: 'Paid' },
      include: { allocations: true },
    })

    const byYear = new Map<string, { annual: number; monthly: number }>()

    payments.forEach((p) => {
      const year = String(p.payment_date.getFullYear())
      let row = byYear.get(year)
      if (!row) {
        row = { annual: 0, monthly: 0 }
        byYear.set(year, row)
      }
      if (p.allocations.length === 0) {
        const amt = Number(p.amount_paid)
        if (p.payment_type === 'Annual') row.annual += amt
        else row.monthly += amt
      } else {
        p.allocations.forEach((a) => {
          const amt = Number(a.amount)
          if (a.allocation_type === 'Annual') row.annual += amt
          else row.monthly += amt
        })
      }
    })

    const years = Array.from(byYear.keys()).sort((a, b) => Number(b) - Number(a))

    return years.map((year, i) => {
      const curr = byYear.get(year)!
      const prior = i + 1 < years.length ? byYear.get(years[i + 1])! : null
      const annualDelta = prior !== null ? curr.annual - prior.annual : null
      const monthlyDelta = prior !== null ? curr.monthly - prior.monthly : null
      const annualPct =
        prior !== null && prior.annual > 0
          ? ((curr.annual - prior.annual) / prior.annual) * 100
          : null
      const monthlyPct =
        prior !== null && prior.monthly > 0
          ? ((curr.monthly - prior.monthly) / prior.monthly) * 100
          : null
      return {
        year,
        annualCollected: curr.annual,
        monthlyCollected: curr.monthly,
        annualDelta,
        monthlyDelta,
        annualPct,
        monthlyPct,
      }
    })
  } catch (error) {
    console.error('Failed to fetch YoY comparison:', error)
    return []
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Allocation Breakdown (Unit 18.2, Stage B)
// Aggregate by billing_year × allocation_type over the selected period.
// Reconciliation: Σ allocations for payments in the period must equal
// Σ payment.amount for the same payments. Nonzero = silent allocation defect.
// ────────────────────────────────────────────────────────────────────────────

export type AllocationBreakdownRow = {
  billingYear: number
  bucket: 'Annual' | 'Monthly'
  allocated: number
  allocationsCount: number
}

export type AllocationBreakdownResult = {
  rows: AllocationBreakdownRow[]
  totalAllocated: number
  totalReceived: number
  discrepancy: number
  paymentsCount: number
}

export async function getAllocationBreakdown(
  periodStart: Date,
  periodEnd: Date,
  regionId?: string
): Promise<AllocationBreakdownResult> {
  try {
    const { dbUser } = await verifyReportsAccess()
    const where = buildPaymentWhere(dbUser, regionId)

    const payments = await prisma.payment.findMany({
      where: {
        ...where,
        status: 'Paid',
        payment_date: { gte: periodStart, lte: periodEnd },
      },
      include: { allocations: true },
    })

    const map = new Map<string, AllocationBreakdownRow>()
    let totalReceived = 0
    let totalAllocated = 0

    payments.forEach((p) => {
      totalReceived += Number(p.amount_paid)
      p.allocations.forEach((a) => {
        const amt = Number(a.amount)
        totalAllocated += amt
        const key = `${a.billing_year}-${a.allocation_type}`
        let row = map.get(key)
        if (!row) {
          row = {
            billingYear: a.billing_year,
            bucket: a.allocation_type as 'Annual' | 'Monthly',
            allocated: 0,
            allocationsCount: 0,
          }
          map.set(key, row)
        }
        row.allocated += amt
        row.allocationsCount += 1
      })
    })

    const rows = Array.from(map.values()).sort((a, b) => {
      if (b.billingYear !== a.billingYear) return b.billingYear - a.billingYear
      return a.bucket.localeCompare(b.bucket)
    })

    return {
      rows,
      totalAllocated,
      totalReceived,
      discrepancy: totalReceived - totalAllocated,
      paymentsCount: payments.length,
    }
  } catch (error) {
    console.error('Failed to fetch allocation breakdown:', error)
    return {
      rows: [],
      totalAllocated: 0,
      totalReceived: 0,
      discrepancy: 0,
      paymentsCount: 0,
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Source / Method Breakdown (Unit 18.2, Stage B)
// Cross-tab: Payment.source × PaymentMethod. Payments only — no PendingPayment,
// no UnmatchedPayment, no write-offs.
// ────────────────────────────────────────────────────────────────────────────

export type SourceMethodRow = {
  source: string
  mPesa: number
  cash: number
  bankTransfer: number
  cheque: number
  total: number
}

export type SourceMethodResult = {
  rows: SourceMethodRow[]
  totals: {
    mPesa: number
    cash: number
    bankTransfer: number
    cheque: number
    grandTotal: number
  }
}

export async function getSourceMethodBreakdown(
  regionId?: string,
  dateFrom?: Date,
  dateTo?: Date
): Promise<SourceMethodResult> {
  try {
    const { dbUser } = await verifyReportsAccess()
    const where = buildPaymentWhere(dbUser, regionId)

    const dateFilter: Prisma.PaymentWhereInput['payment_date'] =
      dateFrom || dateTo
        ? { ...(dateFrom && { gte: dateFrom }), ...(dateTo && { lte: dateTo }) }
        : undefined

    const payments = await prisma.payment.findMany({
      where: {
        ...where,
        status: 'Paid',
        ...(dateFilter ? { payment_date: dateFilter } : {}),
      },
      select: { source: true, payment_method: true, amount_paid: true },
    })

    const bySource = new Map<string, SourceMethodRow>()

    const ensure = (source: string): SourceMethodRow => {
      let row = bySource.get(source)
      if (!row) {
        row = { source, mPesa: 0, cash: 0, bankTransfer: 0, cheque: 0, total: 0 }
        bySource.set(source, row)
      }
      return row
    }

    payments.forEach((p) => {
      const row = ensure(p.source)
      const amt = Number(p.amount_paid)
      if (p.payment_method === 'M_Pesa') row.mPesa += amt
      else if (p.payment_method === 'Cash') row.cash += amt
      else if (p.payment_method === 'Bank_Transfer') row.bankTransfer += amt
      else if (p.payment_method === 'Cheque') row.cheque += amt
      row.total += amt
    })

    // Ensure the three known sources always exist
    ensure('Webhook')
    ensure('Manual')
    ensure('Resolved')

    const rows = Array.from(bySource.values()).sort((a, b) => b.total - a.total)

    const totals = rows.reduce(
      (acc, r) => ({
        mPesa: acc.mPesa + r.mPesa,
        cash: acc.cash + r.cash,
        bankTransfer: acc.bankTransfer + r.bankTransfer,
        cheque: acc.cheque + r.cheque,
        grandTotal: acc.grandTotal + r.total,
      }),
      { mPesa: 0, cash: 0, bankTransfer: 0, cheque: 0, grandTotal: 0 }
    )

    return { rows, totals }
  } catch (error) {
    console.error('Failed to fetch source/method breakdown:', error)
    return {
      rows: [],
      totals: { mPesa: 0, cash: 0, bankTransfer: 0, cheque: 0, grandTotal: 0 },
    }
  }
}



// ────────────────────────────────────────────────────────────────────────────
// Arrears Aging — Drillable (Unit 18.2.2a)
// Per-church gross aging buckets, per ledger. Write-offs disclosed at
// church level (WriteOff has no ledger attribution). Aging math comes
// from getAgingBuckets('Annual' / 'Monthly') — never re-derived here.
// ────────────────────────────────────────────────────────────────────────────

export type ArrearsAgingRow = {
  church_id: string
  church_code: string
  church_name: string
  region_name: string
  is_defunct: boolean
  annual: AgingBuckets & { total_gross: number }
  monthly: AgingBuckets & { total_gross: number }
}

export type ArrearsAgingResult = {
  rows: ArrearsAgingRow[]
  scope_label: string
  computed_at: string
  total_written_off_in_scope: number
  churches_with_write_offs: number
}

export async function getArrearsAgingReport(
  period: 'Annual' | 'Monthly',
  regionId?: string
): Promise<ArrearsAgingResult> {
  // `period` is accepted per spec signature; the server returns BOTH ledgers
  // per row, so the client toggles columns locally without a re-fetch.
  void period

  try {
    const { dbUser } = await verifyReportsAccess()
    const churchWhere = buildChurchWhere(dbUser)
    const where: Prisma.ChurchWhereInput = {
      ...churchWhere,
      // National roles may narrow by region; Regional/Local callers already
      // fail closed via buildChurchWhere, so regionId is ignored for them.
      ...(isNationalLevel(dbUser.role) && regionId ? { region_id: regionId } : {}),
    }

    const churches = await prisma.church.findMany({
      where,
      include: {
        region: true,
        payments: {
          where: { status: 'Paid' },
          include: { allocations: true },
        },
        write_offs: {
          where: { status: 'Approved' },
        },
      },
      orderBy: { church_code: 'asc' },
    })

    const now = new Date()
    const rows: ArrearsAgingRow[] = []
    let total_written_off_in_scope = 0
    let churches_with_write_offs = 0

    churches.forEach((church) => {
      // Write-off disclosure — counts every church in scope with approved
      // write-offs, regardless of whether it has aging > 0. Defunct churches
      // are in scope and therefore included (see spec § Footer total row).
      const writtenOff = sumApprovedWriteOffs(church.write_offs)
      if (writtenOff > 0) {
        total_written_off_in_scope += writtenOff
        churches_with_write_offs += 1
      }

      const annual = getAgingBuckets(church, 'Annual', now)
      const monthly = getAgingBuckets(church, 'Monthly', now)
      const annualTotal =
        annual.bucket0_30 + annual.bucket31_60 + annual.bucket61_90 + annual.bucket90_plus
      const monthlyTotal =
        monthly.bucket0_30 + monthly.bucket31_60 + monthly.bucket61_90 + monthly.bucket90_plus

      // Chase list only — fully-paid churches are excluded.
      if (annualTotal === 0 && monthlyTotal === 0) return

      rows.push({
        church_id: church.id,
        church_code: church.church_code,
        church_name: church.church_name,
        region_name: church.region.name,
        is_defunct: church.is_defunct,
        annual: { ...annual, total_gross: annualTotal },
        monthly: { ...monthly, total_gross: monthlyTotal },
      })
    })

    // Scope label — server-computed so the client can never mis-report scope.
    let scope_label: string
    if (isNationalLevel(dbUser.role)) {
      if (regionId) {
        const region = await prisma.region.findUnique({
          where: { id: regionId },
          select: { name: true },
        })
        scope_label = region ? `Region: ${region.name}` : 'All Regions'
      } else {
        scope_label = 'All Regions'
      }
    } else {
      const isLocalRole =
        dbUser.role === 'LOCAL_PASTOR' || dbUser.role === 'CHURCH_TREASURER'
      if (isLocalRole) {
        scope_label =
          churches.length > 0 ? `Church: ${churches[0].church_code}` : 'Your Church'
      } else {
        scope_label =
          churches.length > 0 ? `Region: ${churches[0].region.name}` : 'Your Region'
      }
    }

    return {
      rows,
      scope_label,
      computed_at: new Date().toISOString(),
      total_written_off_in_scope,
      churches_with_write_offs,
    }
  } catch (error) {
    console.error('Failed to fetch arrears aging report:', error)
    return {
      rows: [],
      scope_label: 'Unknown',
      computed_at: new Date().toISOString(),
      total_written_off_in_scope: 0,
      churches_with_write_offs: 0,
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Prepayment / Credit Position (Unit 18.2.2b)
// Per-church Annual and Monthly credit balances (cash received above accrued
// expectation), rolled up by scope. Strict Bucket Isolation applies.
// ────────────────────────────────────────────────────────────────────────────

export type CreditPositionRow = {
  church_id: string
  church_code: string
  church_name: string
  region_name: string
  is_defunct: boolean
  annual_credit: number
  monthly_credit: number
}

export type CreditPositionResult = {
  rows: CreditPositionRow[]
  scope_label: string
  computed_at: string
  total_annual_credit: number
  total_monthly_credit: number
  churches_with_annual_credit: number
  churches_with_monthly_credit: number
  churches_in_scope: number
}

export async function getPrepaymentCreditPosition(
  regionId?: string
): Promise<CreditPositionResult> {
  try {
    const { dbUser } = await verifyReportsAccess()
    const churchWhere = buildChurchWhere(dbUser)
    const where: Prisma.ChurchWhereInput = {
      ...churchWhere,
      // National roles may narrow by region; Regional/Local callers already
      // fail closed via buildChurchWhere, so regionId is ignored for them.
      ...(isNationalLevel(dbUser.role) && regionId ? { region_id: regionId } : {}),
    }

    const churches = await prisma.church.findMany({
      where,
      include: {
        region: true,
        payments: {
          where: { status: 'Paid' },
          include: { allocations: true },
        },
      },
      orderBy: { church_code: 'asc' },
    })

    const now = new Date()
    const rows: CreditPositionRow[] = []

    churches.forEach((church) => {
      const credit = getCreditPosition(church, now)

      // Reading B: filter to churches holding credit in either bucket.
      // This is a credit liability register, not a full population snapshot.
      // Fully-paid/arrears-only churches at 0/0 are excluded.
      if (credit.annualCredit === 0 && credit.monthlyCredit === 0) return

      rows.push({
        church_id: church.id,
        church_code: church.church_code,
        church_name: church.church_name,
        region_name: church.region.name,
        is_defunct: church.is_defunct,
        annual_credit: credit.annualCredit,
        monthly_credit: credit.monthlyCredit,
      })
    })

    let total_annual_credit = 0
    let total_monthly_credit = 0
    let churches_with_annual_credit = 0
    let churches_with_monthly_credit = 0

    rows.forEach((r) => {
      total_annual_credit += r.annual_credit
      total_monthly_credit += r.monthly_credit
      if (r.annual_credit > 0) churches_with_annual_credit++
      if (r.monthly_credit > 0) churches_with_monthly_credit++
    })

    // Scope label — matches getArrearsAgingReport convention
    let scope_label: string
    if (isNationalLevel(dbUser.role)) {
      if (regionId) {
        const region = await prisma.region.findUnique({
          where: { id: regionId },
          select: { name: true },
        })
        scope_label = region ? `Region: ${region.name}` : 'All Regions'
      } else {
        scope_label = 'All Regions'
      }
    } else {
      const isLocalRole =
        dbUser.role === 'LOCAL_PASTOR' || dbUser.role === 'CHURCH_TREASURER'
      if (isLocalRole) {
        scope_label =
          churches.length > 0 ? `Church: ${churches[0].church_code}` : 'Your Church'
      } else {
        scope_label =
          churches.length > 0 ? `Region: ${churches[0].region.name}` : 'Your Region'
      }
    }

    return {
      rows,
      scope_label,
      computed_at: now.toISOString(),
      total_annual_credit,
      total_monthly_credit,
      churches_with_annual_credit,
      churches_with_monthly_credit,
      churches_in_scope: rows.length,
    }
  } catch (error) {
    console.error('Failed to fetch prepayment credit position:', error)
    return {
      rows: [],
      scope_label: 'Unknown',
      computed_at: new Date().toISOString(),
      total_annual_credit: 0,
      total_monthly_credit: 0,
      churches_with_annual_credit: 0,
      churches_with_monthly_credit: 0,
      churches_in_scope: 0,
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Payment Intake Health (Unit 18.3)
// Three National-only operational reports: Volume, Backlog, and SLA.
// ────────────────────────────────────────────────────────────────────────────

function getPeriodStart(periodDays: number | 'all'): Date | null {
  if (periodDays === 'all') return null
  const d = new Date()
  d.setDate(d.getDate() - periodDays)
  return d
}

function hoursBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / (1000 * 60 * 60)
}

// 1. Payment Intake Volume
export type IntakeVolumeRow = {
  date: string // 'YYYY-MM-DD'
  total_webhooks: number
  matched_stp: number
  resolved_later: number
  captured_unmatched: number
  match_rate_pct: number
  kes_received: number
}

export type IntakeVolumeResult = {
  rows: IntakeVolumeRow[]
  period_label: string
  computed_at: string
  totals: {
    total_webhooks: number
    matched_stp: number
    resolved_later: number
    captured_unmatched: number
    match_rate_pct: number
    straight_through_rate_pct: number
    manual_intervention_rate_pct: number
    rejection_rate_pct: number
    kes_received: number
  }
}

export async function getPaymentIntakeVolume(
  periodDays: number | 'all' = 30
): Promise<IntakeVolumeResult> {
  try {
    const { dbUser } = await verifyReportsAccess()
    if (!isNationalLevel(dbUser.role)) throw new Error('Forbidden')

    const startDate = getPeriodStart(periodDays)

    const [payments, unmatched] = await Promise.all([
      prisma.payment.findMany({
        where: {
          source: { in: ['Webhook', 'Resolved'] },
          ...(startDate ? { payment_date: { gte: startDate } } : {}),
        },
        select: { payment_date: true, amount_paid: true, source: true },
      }),
      prisma.unmatchedPayment.findMany({
        where: {
          ...(startDate ? { created_at: { gte: startDate } } : {}),
        },
        select: { created_at: true, amount: true, status: true },
      }),
    ])

    const byDate = new Map<string, IntakeVolumeRow>()

    const ensure = (dateStr: string): IntakeVolumeRow => {
      let row = byDate.get(dateStr)
      if (!row) {
        row = {
          date: dateStr,
          total_webhooks: 0,
          matched_stp: 0,
          resolved_later: 0,
          captured_unmatched: 0,
          match_rate_pct: 0,
          kes_received: 0,
        }
        byDate.set(dateStr, row)
      }
      return row
    }

    let total_kes = 0
    let total_stp = 0
    let total_manual = 0
    let total_captured = 0

    payments.forEach((p) => {
      const dateStr = p.payment_date.toISOString().split('T')[0]
      const row = ensure(dateStr)
      const amt = Number(p.amount_paid)

      if (p.source === 'Webhook') row.total_webhooks += 1
      row.kes_received += amt
      total_kes += amt

      if (p.source === 'Webhook') {
        row.matched_stp += 1
        total_stp += 1
      } else if (p.source === 'Resolved') {
        row.resolved_later += 1
        total_manual += 1
      }
    })

    let total_rejected = 0

    unmatched.forEach((u) => {
      const dateStr = u.created_at.toISOString().split('T')[0]
      const row = ensure(dateStr)

      row.total_webhooks += 1
      row.captured_unmatched += 1
      total_captured += 1
      if (u.status === 'Rejected') total_rejected += 1
    })

    const rows = Array.from(byDate.values())
      .map((r) => ({
        ...r,
        match_rate_pct: r.total_webhooks > 0 ? ((r.total_webhooks - r.captured_unmatched) / r.total_webhooks) * 100 : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const totalWebhooks = total_stp + total_captured

    return {
      rows,
      period_label: periodDays === 'all' ? 'All Time' : `Last ${periodDays} Days`,
      computed_at: new Date().toISOString(),
      totals: {
        total_webhooks: totalWebhooks,
        matched_stp: total_stp,
        resolved_later: total_manual,
        captured_unmatched: total_captured,
        match_rate_pct: totalWebhooks > 0 ? ((totalWebhooks - total_captured) / totalWebhooks) * 100 : 0,
        straight_through_rate_pct: totalWebhooks > 0 ? (total_stp / totalWebhooks) * 100 : 0,
        manual_intervention_rate_pct: totalWebhooks > 0 ? (total_manual / totalWebhooks) * 100 : 0,
        rejection_rate_pct: totalWebhooks > 0 ? (total_rejected / totalWebhooks) * 100 : 0,
        kes_received: total_kes,
      },
    }
  } catch (error) {
    console.error('Failed to fetch payment intake volume:', error)
    return {
      rows: [],
      period_label: 'Error',
      computed_at: new Date().toISOString(),
      totals: {
        total_webhooks: 0, matched_stp: 0, resolved_later: 0, captured_unmatched: 0,
        match_rate_pct: 0, straight_through_rate_pct: 0, manual_intervention_rate_pct: 0,
        rejection_rate_pct: 0, kes_received: 0,
      },
    }
  }
}

// 2. Unmatched Payment Backlog
export type BacklogBucket = {
  bucket_key: '0-24h' | '24-48h' | '48-72h' | '72h+'
  label: string
  count: number
  kes_value: number
  pct_of_backlog: number
  oldest_item_age_hours: number
}

export type UnmatchedBacklogResult = {
  buckets: BacklogBucket[]
  computed_at: string
  totals: {
    count: number
    kes_value: number
    oldest_item_age_hours: number
    breached_72h_count: number
  }
  oldest_item: { bank_reference: string; age_hours: number } | null
}

export async function getUnmatchedBacklog(): Promise<UnmatchedBacklogResult> {
  try {
    const { dbUser } = await verifyReportsAccess()
    if (!isNationalLevel(dbUser.role)) throw new Error('Forbidden')

    const pending = await prisma.unmatchedPayment.findMany({
      where: { status: 'Pending' },
      select: { created_at: true, amount: true, bank_reference: true },
    })

    const now = new Date()
    const buckets: BacklogBucket[] = [
      { bucket_key: '0-24h', label: '0-24 hours', count: 0, kes_value: 0, pct_of_backlog: 0, oldest_item_age_hours: 0 },
      { bucket_key: '24-48h', label: '24-48 hours', count: 0, kes_value: 0, pct_of_backlog: 0, oldest_item_age_hours: 0 },
      { bucket_key: '48-72h', label: '48-72 hours', count: 0, kes_value: 0, pct_of_backlog: 0, oldest_item_age_hours: 0 },
      { bucket_key: '72h+', label: '72+ hours', count: 0, kes_value: 0, pct_of_backlog: 0, oldest_item_age_hours: 0 },
    ]

    let total_kes = 0
    let oldest_age_hours = -1
    let oldest_bank_ref: string | null = null

    pending.forEach((u) => {
      const ageH = hoursBetween(u.created_at, now)
      const amt = Number(u.amount)
      total_kes += amt

      if (ageH > oldest_age_hours) {
        oldest_age_hours = ageH
        oldest_bank_ref = u.bank_reference
      }

      let b: BacklogBucket
      if (ageH <= 24) b = buckets[0]
      else if (ageH <= 48) b = buckets[1]
      else if (ageH <= 72) b = buckets[2]
      else b = buckets[3]

      b.count += 1
      b.kes_value += amt
      if (ageH > b.oldest_item_age_hours) b.oldest_item_age_hours = ageH
    })

    const totalCount = pending.length
    buckets.forEach((b) => {
      b.pct_of_backlog = totalCount > 0 ? (b.count / totalCount) * 100 : 0
    })

    const oldest_item = oldest_bank_ref !== null
      ? { bank_reference: oldest_bank_ref, age_hours: oldest_age_hours }
      : null

    return {
      buckets,
      computed_at: now.toISOString(),
      totals: {
        count: totalCount,
        kes_value: total_kes,
        oldest_item_age_hours: oldest_age_hours > 0 ? oldest_age_hours : 0,
        breached_72h_count: buckets[3].count,
      },
      oldest_item,
    }
  } catch (error) {
    console.error('Failed to fetch unmatched backlog:', error)
    return {
      buckets: [],
      computed_at: new Date().toISOString(),
      totals: { count: 0, kes_value: 0, oldest_item_age_hours: 0, breached_72h_count: 0 },
      oldest_item: null,
    }
  }
}

// 3. Resolution SLA Aging
export type SlaBucket = {
  bucket_key: '0-24h' | '24-48h' | '48-72h' | '72h+'
  label: string
  resolved: number
  rejected: number
  written_off: number
  total_actioned: number
  avg_time_hours: number
  sla_met: boolean
}

export type SlaAgingResult = {
  buckets: SlaBucket[]
  period_label: string
  computed_at: string
  totals: {
    items_actioned: number
    sla_met_pct: number
    avg_resolution_hours: number
    breached_count: number
    kes_resolved: number
  }
}

export async function getSlaAging(
  periodDays: number | 'all' = 30
): Promise<SlaAgingResult> {
  try {
    const { dbUser } = await verifyReportsAccess()
    if (!isNationalLevel(dbUser.role)) throw new Error('Forbidden')

    const startDate = getPeriodStart(periodDays)

    const actioned = await prisma.unmatchedPayment.findMany({
      where: {
        status: { in: ['Resolved', 'Rejected', 'WrittenOff'] },
        ...(startDate ? { reviewed_at: { gte: startDate } } : {}),
      },
      select: { created_at: true, reviewed_at: true, status: true, amount: true },
    })

    const buckets: SlaBucket[] = [
      { bucket_key: '0-24h', label: '0-24 hours', resolved: 0, rejected: 0, written_off: 0, total_actioned: 0, avg_time_hours: 0, sla_met: true },
      { bucket_key: '24-48h', label: '24-48 hours', resolved: 0, rejected: 0, written_off: 0, total_actioned: 0, avg_time_hours: 0, sla_met: true },
      { bucket_key: '48-72h', label: '48-72 hours', resolved: 0, rejected: 0, written_off: 0, total_actioned: 0, avg_time_hours: 0, sla_met: true },
      { bucket_key: '72h+', label: '72+ hours', resolved: 0, rejected: 0, written_off: 0, total_actioned: 0, avg_time_hours: 0, sla_met: false },
    ]

    let total_hours_sum = 0
    let items_actioned = 0
    let kes_resolved = 0
    let breached_count = 0
    let sla_met_count = 0

    actioned.forEach((u) => {
      if (!u.reviewed_at) return // Should not happen given the query, but TS guard

      const timeH = hoursBetween(u.created_at, u.reviewed_at)
      const amt = Number(u.amount)
      
      kes_resolved += amt
      total_hours_sum += timeH
      items_actioned += 1

      if (timeH <= 72) sla_met_count += 1
      else breached_count += 1

      let b: SlaBucket
      if (timeH <= 24) b = buckets[0]
      else if (timeH <= 48) b = buckets[1]
      else if (timeH <= 72) b = buckets[2]
      else b = buckets[3]

      b.total_actioned += 1
      b.avg_time_hours = ((b.avg_time_hours * (b.total_actioned - 1)) + timeH) / b.total_actioned

      if (u.status === 'Resolved') b.resolved += 1
      else if (u.status === 'Rejected') b.rejected += 1
      else if (u.status === 'WrittenOff') b.written_off += 1
    })

    return {
      buckets,
      period_label: periodDays === 'all' ? 'All Time' : `Last ${periodDays} Days`,
      computed_at: new Date().toISOString(),
      totals: {
        items_actioned,
        sla_met_pct: items_actioned > 0 ? (sla_met_count / items_actioned) * 100 : 0,
        avg_resolution_hours: items_actioned > 0 ? total_hours_sum / items_actioned : 0,
        breached_count,
        kes_resolved,
      },
    }
  } catch (error) {
    console.error('Failed to fetch SLA aging:', error)
    return {
      buckets: [],
      period_label: 'Error',
      computed_at: new Date().toISOString(),
      totals: { items_actioned: 0, sla_met_pct: 0, avg_resolution_hours: 0, breached_count: 0, kes_resolved: 0 },
    }
  }
}
