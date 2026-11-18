'use server'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { verifyReportsAccess } from '@/lib/auth/guards'
import { buildChurchWhere, buildPaymentWhere } from '@/lib/utils/report-scope'
import { getExpectedUpToDate, sumApprovedWriteOffs, getNetOutstanding } from '@/lib/utils/financial'
import { isNationalLevel } from '@/lib/auth/roles'

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
}

export async function getWriteOffRegister(): Promise<WriteOffRow[]> {
  try {
    const { dbUser } = await verifyReportsAccess()
    const churchWhere = buildChurchWhere(dbUser)

    const writeOffs = await prisma.writeOff.findMany({
      where: {
        status: 'Approved',
        church: churchWhere
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
      status: w.status
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
}

export async function getDefunctChurchRegister(): Promise<DefunctRow[]> {
  try {
    const { dbUser } = await verifyReportsAccess()
    const churchWhere = buildChurchWhere(dbUser)

    const churches = await prisma.church.findMany({
      where: {
        ...churchWhere,
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
      date_marked_defunct: c.write_offs[0]?.approved_at?.toISOString() || null
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