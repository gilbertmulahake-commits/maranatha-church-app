import { Building2, TrendingUp, AlertCircle, XCircle, CalendarDays } from 'lucide-react'
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StackedBar } from '@/components/dashboard/stacked-bar'

interface ChurchStats {
  total: number
  compliant: number
  partial: number
  overdue: number
  na: number
}

interface ChurchKpiProps {
  localStats: ChurchStats
  nationalStats: ChurchStats
  periodView: 'month' | 'year'
  onFilterChange?: (status: string) => void
}

export function ChurchKpiCards({
  localStats = { total: 0, compliant: 0, partial: 0, overdue: 0, na: 0 },
  nationalStats = { total: 0, compliant: 0, partial: 0, overdue: 0, na: 0 },
  periodView,
  onFilterChange,
}: ChurchKpiProps) {
  const cardClasses =
    'h-full cursor-pointer transition-transform hover:-translate-y-1 hover:shadow-md bg-gradient-to-t from-primary/5 to-card'

  const compliantPct = localStats.total > 0 ? (localStats.compliant / localStats.total) * 100 : 0
  const partialPct = localStats.total > 0 ? (localStats.partial / localStats.total) * 100 : 0
  const overduePct = localStats.total > 0 ? (localStats.overdue / localStats.total) * 100 : 0
  const viewLabel = periodView === 'year' ? 'Annual view' : 'Monthly view'

  return (
    <div className="grid grid-cols-1 gap-md md:grid-cols-2 lg:grid-cols-4">
      <Card className={cardClasses} onClick={() => onFilterChange?.('All')}>
        <CardHeader>
          <CardDescription>Total Churches</CardDescription>
          <CardTitle className="text-heading-1 font-bold tabular-nums">
            {localStats.total.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <CalendarDays className="h-3 w-3" /> {viewLabel}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-2 text-sm">
          <StackedBar
            segments={[
              { label: `${localStats.compliant} paid`, value: localStats.compliant, color: 'bg-emerald-500' },
              { label: `${localStats.partial} partial`, value: localStats.partial, color: 'bg-amber-500' },
              { label: `${localStats.overdue} overdue`, value: localStats.overdue, color: 'bg-red-500' },
              ...(localStats.na > 0 ? [{ label: `${localStats.na} N/A`, value: localStats.na, color: 'bg-gray-400' }] : []),
            ]}
          />
          <p className="text-paragraph-mini text-muted-foreground">
            Complete registry · {viewLabel.toLowerCase()}
            {localStats.na > 0 && ` · ${localStats.na} N/A`}
          </p>
        </CardFooter>
      </Card>

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
            {compliantPct.toFixed(1)}% of {localStats.total} · {viewLabel.toLowerCase()}
          </p>
          <p className="text-paragraph-mini text-muted-foreground">Fully up to date</p>
        </CardFooter>
      </Card>

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
            {partialPct.toFixed(1)}% of {localStats.total} · {viewLabel.toLowerCase()}
          </p>
          <p className="text-paragraph-mini text-muted-foreground">Requires follow-up</p>
        </CardFooter>
      </Card>

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
            {overduePct.toFixed(1)}% of {localStats.total} · {viewLabel.toLowerCase()}
          </p>
          <p className="text-paragraph-mini text-muted-foreground">Immediate reminder needed</p>
        </CardFooter>
      </Card>
    </div>
  )
}