import { Target, TrendingUp, Sparkles, Activity } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface HeroKpiProps {
  totalCollectedThisYear: number
  targetAmount: number
  collectionPct: number
  totalExpectedThisYear: number
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function HeroKpi({ 
  totalCollectedThisYear, 
  targetAmount, 
  collectionPct,
  totalExpectedThisYear
}: HeroKpiProps) {
  const visualPct = Math.min(collectionPct, 100)
  const isExceeded = collectionPct > 100

  return (
    <div className="relative overflow-hidden rounded-2xl bg-sidebar p-8 shadow-lg h-full flex flex-col justify-between border border-sidebar-border">
      {/* Premium gradient using our primary token */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-sidebar to-sidebar" />
      
      <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="space-y-2">
          <Badge variant="outline" className="bg-sidebar-foreground/10 text-sidebar-foreground border-sidebar-foreground/20 hover:bg-sidebar-foreground/20 transition-colors">
            <Sparkles className="h-3 w-3 mr-1" /> {new Date().getFullYear()} National Target
          </Badge>
          <h2 className="text-heading-1 font-bold text-sidebar-foreground mt-2">
            {formatCurrency(totalCollectedThisYear)}
          </h2>
          <p className="text-paragraph-small text-sidebar-foreground/70 flex items-center gap-2">
            <Target className="h-4 w-4" /> 
            Target: {formatCurrency(targetAmount)}
          </p>
        </div>
        
        <div className="text-left md:text-right">
          <div className="text-heading-1 font-bold text-emerald-400">
            {collectionPct.toFixed(1)}%
          </div>
          <p className="text-paragraph-small text-sidebar-foreground/70 flex items-center md:justify-end gap-1">
            <TrendingUp className="h-4 w-4 text-emerald-400" /> 
            {isExceeded ? 'Target Exceeded' : 'of total target'}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative z-10 mt-8">
        <div className="h-3 w-full rounded-full bg-sidebar-foreground/20 overflow-hidden shadow-inner">
          <div 
            className={`h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(16,185,129,0.3)] ${isExceeded ? 'bg-emerald-400' : 'bg-emerald-500'}`}
            style={{ width: `${visualPct}%` }}
          />
        </div>
        <div className="flex flex-col md:flex-row justify-between mt-4 gap-2 text-paragraph-small text-sidebar-foreground/60">
          <span className="flex items-center gap-1">
            <Activity className="h-3 w-3" /> 
            Expected Dues YTD: <strong className="text-sidebar-foreground">{formatCurrency(totalExpectedThisYear)}</strong>
          </span>
          <span>Target: {formatCurrency(targetAmount)}</span>
        </div>
      </div>
    </div>
  )
}