import { Banknote, Target, AlertTriangle, Users } from 'lucide-react'

interface KpiCardsProps {
  totalCollected: number
  totalExpected: number
  outstanding: number
  collectionPct: number
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
  totalExpected,
  outstanding,
  collectionPct,
  totalChurches,
  totalRegions,
}: KpiCardsProps) {
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
          ↑ Collected to date
        </p>
      </div>

      {/* Card 2: Target Progress */}
      <div className="relative overflow-hidden rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
        <div className="absolute right-4 top-4 text-[#2563EB] opacity-10">
          <Target className="h-16 w-16" />
        </div>
        <p className="text-sm font-medium text-[#64748B]">Target Progress</p>
        <p className="mt-2 text-2xl font-bold tabular-nums text-[#0F172A]">
          {collectionPct.toFixed(1)}%
        </p>
        <div className="mt-3 h-2 w-full rounded-full bg-[#E2E8F0]">
          <div
            className="h-2 rounded-full bg-[#2563EB]"
            style={{ width: `${Math.min(collectionPct, 100)}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-[#64748B]">
          Target: {formatCurrency(totalExpected)}
        </p>
      </div>

      {/* Card 3: Outstanding Arrears */}
      <div className="relative overflow-hidden rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
        <div className="absolute right-4 top-4 text-[#EF4444] opacity-10">
          <AlertTriangle className="h-16 w-16" />
        </div>
        <p className="text-sm font-medium text-[#64748B]">Outstanding Arrears</p>
        <p className="mt-2 text-2xl font-bold tabular-nums text-[#EF4444]">
          {formatCurrency(outstanding)}
        </p>
        <p className="mt-2 text-xs font-medium text-[#64748B]">
          Remaining to collect
        </p>
      </div>

      {/* Card 4: Active Churches */}
      <div className="relative overflow-hidden rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
        <div className="absolute right-4 top-4 text-[#0F172A] opacity-10">
          <Users className="h-16 w-16" />
        </div>
        <p className="text-sm font-medium text-[#64748B]">Active Churches</p>
        <p className="mt-2 text-2xl font-bold tabular-nums text-[#0F172A]">
          {totalChurches.toLocaleString()}
        </p>
        <p className="mt-2 text-xs font-medium text-[#64748B]">
          Across {totalRegions} regions
        </p>
      </div>
    </div>
  )
}