import { Banknote, Target, CheckCircle2 } from 'lucide-react'

interface KpiCardsProps {
  totalCollected: number
  totalCollectedAnnual: number
  totalCollectedMonthly: number
  totalExpectedAnnual: number
  totalExpectedMonthly: number
  outstanding: number
  compliancePct: number
  totalChurches: number
  totalRegions: number
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function KpiCards({
  totalCollected,
  totalCollectedAnnual,
  totalCollectedMonthly,
  totalExpectedAnnual,
  totalExpectedMonthly,
  outstanding,
  compliancePct,
  totalChurches,
  totalRegions,
}: KpiCardsProps) {
  const annualPct = totalExpectedAnnual > 0 ? (totalCollectedAnnual / totalExpectedAnnual) * 100 : 0
  const monthlyPct = totalExpectedMonthly > 0 ? (totalCollectedMonthly / totalExpectedMonthly) * 100 : 0

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {/* Card 1: Total Collected */}
      <div className="relative overflow-hidden rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
        <div className="absolute right-4 top-4 text-[#10B981] opacity-10">
          <Banknote className="h-16 w-16" />
        </div>
        <p className="text-sm font-medium text-[#64748B]">Total Collected</p>
        <p className="mt-2 text-2xl font-bold tabular-nums text-[#0F172A]">
          {formatCurrency(totalCollected)}
        </p>
        <p className="mt-2 text-xs font-medium text-[#10B981]">
          {formatCurrency(outstanding)} remaining
        </p>
      </div>

      {/* Card 2: Annual Progress */}
      <div className="relative overflow-hidden rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
        <div className="absolute right-4 top-4 text-[#2563EB] opacity-10">
          <Target className="h-16 w-16" />
        </div>
        <p className="text-sm font-medium text-[#64748B]">Annual Progress</p>
        <p className="mt-2 text-2xl font-bold tabular-nums text-[#0F172A]">
          {annualPct.toFixed(1)}%
        </p>
        <div className="mt-3 h-2 w-full rounded-full bg-[#E2E8F0]">
          <div className="h-2 rounded-full bg-[#2563EB]" style={{ width: `${Math.min(annualPct, 100)}%` }} />
        </div>
        <p className="mt-2 text-xs text-[#64748B]">
          Target: {formatCurrency(totalExpectedAnnual)}
        </p>
      </div>

      {/* Card 3: Monthly Progress */}
      <div className="relative overflow-hidden rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
        <div className="absolute right-4 top-4 text-[#F59E0B] opacity-10">
          <Target className="h-16 w-16" />
        </div>
        <p className="text-sm font-medium text-[#64748B]">Monthly Progress</p>
        <p className="mt-2 text-2xl font-bold tabular-nums text-[#0F172A]">
          {monthlyPct.toFixed(1)}%
        </p>
        <div className="mt-3 h-2 w-full rounded-full bg-[#E2E8F0]">
          <div className="h-2 rounded-full bg-[#F59E0B]" style={{ width: `${Math.min(monthlyPct, 100)}%` }} />
        </div>
        <p className="mt-2 text-xs text-[#64748B]">
          Target: {formatCurrency(totalExpectedMonthly)}
        </p>
      </div>

      {/* Card 4: Fair Compliance Rate */}
      <div className="relative overflow-hidden rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
        <div className="absolute right-4 top-4 text-[#0F172A] opacity-10">
          <CheckCircle2 className="h-16 w-16" />
        </div>
        <p className="text-sm font-medium text-[#64748B]">Compliance Rate</p>
        <p className="mt-2 text-2xl font-bold tabular-nums text-[#0F172A]">
          {compliancePct.toFixed(1)}%
        </p>
        <p className="mt-2 text-xs font-medium text-[#64748B]">
          {totalChurches} churches in {totalRegions} regions
        </p>
      </div>
    </div>
  )
}