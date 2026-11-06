import { Building2, TrendingUp, AlertCircle, XCircle } from 'lucide-react'
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StackedBar } from '@/components/dashboard/stacked-bar'

interface ChurchStats {
  total: number
  compliant: number
  partial: number
  overdue: number
}

interface ChurchKpiProps {
  localStats: ChurchStats
  nationalStats: ChurchStats
  onFilterChange?: (status: string) => void
}

export function ChurchKpiCards({ 
  localStats = { total: 0, compliant: 0, partial: 0, overdue: 0 }, 
  nationalStats = { total: 0, compliant: 0, partial: 0, overdue: 0 },
  onFilterChange
}: ChurchKpiProps) {
  
  // UNIFIED CLASSES
  const cardClasses = "h-full cursor-pointer transition-transform hover:-translate-y-1 hover:shadow-md bg-gradient-to-t from-primary/5 to-card"

  // Percentages within the current view (which, on the Churches tab, is always national-scope)
  const compliantPct = localStats.total > 0 ? (localStats.compliant / localStats.total) * 100 : 0
  const partialPct = localStats.total > 0 ? (localStats.partial / localStats.total) * 100 : 0
  const overduePct = localStats.total > 0 ? (localStats.overdue / localStats.total) * 100 : 0

  return (
    <div className="grid grid-cols-1 gap-md md:grid-cols-2 lg:grid-cols-4">
      
      {/* CARD 1: Total Churches — always national scope, no "Filtered" badge */}
      <Card className={cardClasses} onClick={() => onFilterChange?.('All')}>
        <CardHeader>
          <CardDescription>Total Churches</CardDescription>
          <CardTitle className="text-heading-1 font-bold tabular-nums">
            {localStats.total.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <Building2 className="h-3 w-3" /> National
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <StackedBar
            segments={[
              { label: `${localStats.compliant} paid`, value: localStats.compliant, color: 'bg-emerald-500' },
              { label: `${localStats.partial} partial`, value: localStats.partial, color: 'bg-amber-500' },
              { label: `${localStats.overdue} overdue`, value: localStats.overdue, color: 'bg-red-500' },
            ]}
          />
          <p className="text-paragraph-mini text-muted-foreground">
            Complete registry
          </p>
        </CardFooter>
      </Card>

      {/* CARD 2: Compliant */}
      <Card className={cardClasses} onClick={() => onFilterChange?.('Paid')}>
        <CardHeader>
          <CardDescription>Compliant</CardDescription>
          <CardTitle className="text-heading-1 font-bold tabular-nums text-emerald-600">
            {localStats.compliant.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
              <TrendingUp className="h-3 w-3" /> {compliantPct.toFixed(1)}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <p className="line-clamp-1 flex gap-2 font-medium text-paragraph-small">
            {compliantPct.toFixed(1)}% of {localStats.total} nationally
          </p>
          <p className="text-paragraph-mini text-muted-foreground">
            Fully up to date
          </p>
        </CardFooter>
      </Card>

      {/* CARD 3: Partial */}
      <Card className={cardClasses} onClick={() => onFilterChange?.('Partial')}>
        <CardHeader>
          <CardDescription>Partial</CardDescription>
          <CardTitle className="text-heading-1 font-bold tabular-nums text-amber-600">
            {localStats.partial.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
              <AlertCircle className="h-3 w-3" /> {partialPct.toFixed(1)}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <p className="line-clamp-1 flex gap-2 font-medium text-paragraph-small">
            {partialPct.toFixed(1)}% of {localStats.total} nationally
          </p>
          <p className="text-paragraph-mini text-muted-foreground">
            Requires follow-up
          </p>
        </CardFooter>
      </Card>

      {/* CARD 4: Overdue */}
      <Card className={cardClasses} onClick={() => onFilterChange?.('Overdue')}>
        <CardHeader>
          <CardDescription>Overdue</CardDescription>
          <CardTitle className="text-heading-1 font-bold tabular-nums text-destructive">
            {localStats.overdue.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="text-destructive border-destructive/20 bg-destructive/10">
              <XCircle className="h-3 w-3" /> {overduePct.toFixed(1)}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <p className="line-clamp-1 flex gap-2 font-medium text-paragraph-small">
            {overduePct.toFixed(1)}% of {localStats.total} nationally
          </p>
          <p className="text-paragraph-mini text-muted-foreground">
            Immediate reminder needed
          </p>
        </CardFooter>
      </Card>

    </div>
  )
}