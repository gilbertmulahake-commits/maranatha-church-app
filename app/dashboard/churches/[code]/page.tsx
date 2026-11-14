import { Suspense } from 'react'
import { connection } from 'next/server'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ChurchProfileClient } from '@/components/churches/church-profile-client'
import { getExpectedUpToDate, getPeriodStatus, getCreditBalance } from '@/lib/utils/financial'

import { KpiGrid } from '@/components/ui/kpi-grid'

async function ChurchProfileContent({ params }: { params: Promise<{ code: string }> }) {
  await connection()
  const resolvedParams = await params

  const church = await prisma.church.findUnique({
    where: { church_code: resolvedParams.code },
    include: {
      region: true,
      payments: {
        where: { status: 'Paid' },
        include: { allocations: true },
        orderBy: { payment_date: 'desc' },
      },
    },
  })

  if (!church) return notFound()

  const now = new Date()
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

  const totalPaid = annualPaid + monthlyPaid
  const { expectedAnnual, expectedMonthly, totalExpected } = getExpectedUpToDate(church.created_at, now)

  const annualOutstanding = Math.max(0, expectedAnnual - annualPaid)
  const monthlyOutstanding = Math.max(0, expectedMonthly - monthlyPaid)

  let annualStatus: 'Paid' | 'Partial' | 'Overdue' | 'N/A' = getPeriodStatus(annualPaid, expectedAnnual)
  const monthlyStatus = getPeriodStatus(monthlyPaid, expectedMonthly)
  if (expectedAnnual === 0 && annualPaid === 0) annualStatus = 'N/A'

  let overallStatus: 'Paid' | 'Partial' | 'Overdue' = 'Partial'
  if (annualStatus === 'Paid' && monthlyStatus === 'Paid') overallStatus = 'Paid'
  else if (annualStatus === 'Overdue' && monthlyStatus === 'Overdue') overallStatus = 'Overdue'

  // Map payments to match the exact LocalChurchStats shape
  const formattedPayments = church.payments.map((p) => {
    let hasAnnual = false
    let hasMonthly = false

    if (p.allocations.length === 0) {
      if (p.payment_type === 'Annual') hasAnnual = true
      else hasMonthly = true
    } else {
      hasAnnual = p.allocations.some(a => a.allocation_type === 'Annual')
      hasMonthly = p.allocations.some(a => a.allocation_type === 'Monthly')
    }

    return {
      id: p.id,
      transaction_id: p.transaction_id,
      amount_paid: Number(p.amount_paid),
      payment_type: p.payment_type,
      payment_date: p.payment_date.toISOString(),
      payment_method: p.payment_method,
      has_annual: hasAnnual,
      has_monthly: hasMonthly,
      is_mixed: hasAnnual && hasMonthly,
      // ADDED: Map the allocations for the breakdown dialog
      allocations: p.allocations.map(a => ({
        allocation_type: a.allocation_type,
        billing_year: a.billing_year,
        billing_month: a.billing_month,
        amount: Number(a.amount)
      }))
    }
  })

  const stats = {
    churchName: church.church_name,
    churchCode: church.church_code,
    regionName: church.region?.name || 'Unassigned',
    totalPaid,
    annualPaid,
    monthlyPaid,
    expectedAnnual,
    expectedMonthly,
    totalExpected,
    annualOutstanding,
    monthlyOutstanding,
    totalOutstanding: annualOutstanding + monthlyOutstanding,
    annualCredit: getCreditBalance(annualPaid, expectedAnnual),
    monthlyCredit: getCreditBalance(monthlyPaid, expectedMonthly),
    annualStatus,
    monthlyStatus,
    overallStatus,
    payments: formattedPayments,
  }

  return (
    <div className="space-y-xl">
      {/* Contextual Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-sm">
          <Link href="/dashboard/churches">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-heading-2 font-bold text-foreground">{church.church_name}</h1>
            <p className="mt-xs text-paragraph-small text-muted-foreground">
              {church.church_code} &middot; {church.region?.name || 'Unassigned'} Region
            </p>
          </div>
        </div>
        
        <Badge
          variant="outline"
          className={
            overallStatus === 'Paid'
              ? 'text-emerald-600 border-emerald-200 bg-emerald-50'
              : overallStatus === 'Partial'
              ? 'text-amber-600 border-amber-200 bg-amber-50'
              : 'text-destructive border-destructive/20 bg-destructive/10'
          }
        >
          {overallStatus}
        </Badge>
      </div>

      {/* Render the interactive client wrapper */}
      <ChurchProfileClient stats={stats} />
    </div>
  )
}

export default function ChurchProfilePage({ params }: { params: Promise<{ code: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="space-y-xl">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-md" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-[250px]" />
              <Skeleton className="h-4 w-[150px]" />
            </div>
          </div>
          <KpiGrid>
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </KpiGrid>
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
      }
    >
      <ChurchProfileContent params={params} />
    </Suspense>
  )
}