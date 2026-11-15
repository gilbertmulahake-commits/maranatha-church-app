import { Target, TrendingUp, Sparkles, Activity } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface HeroKpiProps {
  range: 'week' | 'month' | 'year' | 'all'
  stats: {
    totalCollectedThisYear: number
    totalExpectedThisYear: number
    targetAmount: number
    totalCollectedThisWeek: number
    thisMonthCollections: number
    thisMonthExpected: number
    totalCollected: number
    totalExpected: number
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount)
}

export function HeroKpi({ range, stats }: HeroKpiProps) {
  // Mathematical selection based on range
  const collected = range === 'week' ? stats.totalCollectedThisWeek 
                  : range === 'month' ? stats.thisMonthCollections 
                  : range === 'year' ? stats.totalCollectedThisYear 
                  : stats.totalCollected

  const expected = range === 'week' ? 0 // We don't track weekly expected yet
                 : range === 'month' ? stats.thisMonthExpected 
                 : range === 'year' ? stats.totalExpectedThisYear 
                 : stats.totalExpected

  const target = range === 'year' ? stats.targetAmount : 0

  // Progress calculation: Track against Expected-to-Date, not Year-End Target
  const adherencePct = expected > 0 ? (collected / expected) * 100 : 0
  const visualPct = Math.min(adherencePct, 100)
  const isExceeded = adherencePct > 100

  const label = {
    week: 'This Week Collections',
    month: 'This Month Collections',
    year: `${new Date().getFullYear()} National Schedule`,
    all: 'Lifetime Collections'
  }[range]

  return (
    <div className="relative overflow-hidden rounded-2xl bg-sidebar p-6 @[400px]/hero:p-8 shadow-lg h-full flex flex-col justify-between border border-sidebar-border @container/hero">
      
      {/* Background FX */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-60 mix-blend-screen" />
        <svg className="absolute -bottom-32 -right-32 w-[600px] h-[600px] text-sidebar-foreground/5" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="0.5">
          <circle cx="50" cy="50" r="20" />
          <circle cx="50" cy="50" r="30" />
          <circle cx="50" cy="50" r="40" />
          <circle cx="50" cy="50" r="50" />
          <circle cx="50" cy="50" r="60" />
          <circle cx="50" cy="50" r="70" />
          <circle cx="50" cy="50" r="80" />
          <circle cx="50" cy="50" r="90" />
        </svg>
      </div>

      <div className="relative z-10 grid grid-cols-1 @[320px]/hero:grid-cols-2 gap-4 @[320px]/hero:gap-6 items-start">
        
        <div className="space-y-2">
          <Badge variant="outline" className="bg-sidebar-foreground/10 text-sidebar-foreground border-sidebar-foreground/20">
            <Sparkles className="h-3 w-3 mr-1" /> {label}
          </Badge>
          <h2 className="text-heading-1 font-bold text-sidebar-foreground mt-2 tracking-tight">
            {formatCurrency(collected)}
          </h2>
          {target > 0 && (
            <p className="text-paragraph-small text-sidebar-foreground/70 flex items-center gap-2">
              <Target className="h-4 w-4" /> 
              Year-End Target: {formatCurrency(target)}
            </p>
          )}
        </div>
        
        {expected > 0 && (
          <div className="text-left @[320px]/hero:text-right pt-1 @[320px]/hero:pt-0">
            <div className="text-heading-1 font-bold text-emerald-400">
              {adherencePct.toFixed(1)}%
            </div>
            <p className="text-paragraph-small text-sidebar-foreground/70 flex items-center @[320px]/hero:justify-end gap-1">
              <TrendingUp className="h-4 w-4 text-emerald-400" /> 
              {isExceeded ? 'Ahead of schedule' : 'of schedule'}
            </p>
          </div>
        )}
      </div>

      {expected > 0 && (
        <div className="relative z-10 mt-6 @[320px]/hero:mt-8">
          <div className="h-3 w-full rounded-full bg-sidebar-foreground/20 overflow-hidden shadow-inner backdrop-blur-sm">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(16,185,129,0.5)] ${isExceeded ? 'bg-emerald-400' : 'bg-emerald-500'}`}
              style={{ width: `${visualPct}%` }}
            />
          </div>
          <div className="flex flex-col @[320px]/hero:flex-row justify-between mt-4 gap-2 text-paragraph-small text-sidebar-foreground/60">
            <span className="flex items-center gap-1">
              <Activity className="h-3 w-3" /> 
              Expected-to-Date: <strong className="text-sidebar-foreground">{formatCurrency(expected)}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}