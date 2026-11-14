"use client"

import { Building2, CheckCircle, AlertTriangle } from 'lucide-react'
import { Card, CardAction, CardDescription, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

import { StackedBar } from '@/components/dashboard/stacked-bar'
import { KpiGrid } from '@/components/ui/kpi-grid'
import { KpiValue } from '@/components/ui/kpi-value'

interface Props {
  localStats: { total: number; compliant: number; partial: number; overdue: number; na: number }
  periodView: 'month' | 'year'
  onFilterChange: (status: string) => void
}

export function ChurchKpiCards({ localStats, periodView, onFilterChange }: Props) {
  const cardClasses = "h-full cursor-pointer transition-transform hover:-translate-y-1 hover:shadow-md bg-gradient-to-t from-primary/5 to-card @container/card"
  const viewLabel = periodView === 'year' ? 'annual view' : 'monthly view'

  return (
    <KpiGrid>
      
      <Card className={cardClasses} onClick={() => onFilterChange('All')}>
        <CardHeader className="p-4 pb-2">
          <CardDescription className="text-xs font-medium text-muted-foreground">Total Churches</CardDescription>
          <KpiValue>
            {localStats.total}
          </KpiValue>
          <CardAction className="shrink-0">
            <Badge variant="outline" className="text-[10px] px-2 py-0.5">
              <Building2 className="h-3 w-3 mr-1" /> {viewLabel}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-2 text-xs p-4 pt-2">
          <StackedBar
            segments={[
              { label: `${localStats.compliant} paid`, value: localStats.compliant, color: 'bg-emerald-500' },
              { label: `${localStats.partial} partial`, value: localStats.partial, color: 'bg-amber-500' },
              { label: `${localStats.overdue} overdue`, value: localStats.overdue, color: 'bg-red-500' },
              { label: `${localStats.na} N/A`, value: localStats.na, color: 'bg-gray-400' },
            ]}
          />
          <p className="text-[11px] text-muted-foreground">
            Complete registry · {viewLabel}
          </p>
        </CardFooter>
      </Card>

      <Card className={cardClasses} onClick={() => onFilterChange('Paid')}>
        <CardHeader className="p-4 pb-2">
          <CardDescription className="text-xs font-medium text-muted-foreground">Compliant</CardDescription>
          <KpiValue className="text-emerald-600">
            {localStats.compliant}
          </KpiValue>
          <CardAction className="shrink-0">
            <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 text-[10px] px-2 py-0.5">
              <CheckCircle className="h-3 w-3 mr-1" /> {localStats.total > 0 ? ((localStats.compliant / localStats.total) * 100).toFixed(1) : 0}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-2 text-xs p-4 pt-2">
          <p className="text-xs font-medium text-foreground">
            {localStats.total > 0 ? ((localStats.compliant / localStats.total) * 100).toFixed(1) : 0}% of {localStats.total} · {viewLabel}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Fully up to date
          </p>
        </CardFooter>
      </Card>

      <Card className={cardClasses} onClick={() => onFilterChange('Partial')}>
        <CardHeader className="p-4 pb-2">
          <CardDescription className="text-xs font-medium text-muted-foreground">Partial</CardDescription>
          <KpiValue className="text-amber-600">
            {localStats.partial}
          </KpiValue>
          <CardAction className="shrink-0">
            <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 text-[10px] px-2 py-0.5">
              <AlertTriangle className="h-3 w-3 mr-1" /> {localStats.total > 0 ? ((localStats.partial / localStats.total) * 100).toFixed(1) : 0}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-2 text-xs p-4 pt-2">
          <p className="text-xs font-medium text-foreground">
            {localStats.total > 0 ? ((localStats.partial / localStats.total) * 100).toFixed(1) : 0}% of {localStats.total} · {viewLabel}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Requires follow-up
          </p>
        </CardFooter>
      </Card>

      <Card className={cardClasses} onClick={() => onFilterChange('Overdue')}>
        <CardHeader className="p-4 pb-2">
          <CardDescription className="text-xs font-medium text-muted-foreground">Overdue</CardDescription>
          <KpiValue className="text-destructive">
            {localStats.overdue}
          </KpiValue>
          <CardAction className="shrink-0">
            <Badge variant="outline" className="text-destructive border-destructive/20 bg-destructive/10 text-[10px] px-2 py-0.5">
              <AlertTriangle className="h-3 w-3 mr-1" /> {localStats.total > 0 ? ((localStats.overdue / localStats.total) * 100).toFixed(1) : 0}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-2 text-xs p-4 pt-2">
          <p className="text-xs font-medium text-foreground">
            {localStats.total > 0 ? ((localStats.overdue / localStats.total) * 100).toFixed(1) : 0}% of {localStats.total} · {viewLabel}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Immediate reminder needed
          </p>
        </CardFooter>
      </Card>

    </KpiGrid>
  )
}