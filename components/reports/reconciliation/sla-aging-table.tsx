'use client'

import { useState, useMemo } from 'react'
import { ArrowUpDown, Inbox } from 'lucide-react'
import {
  SlaAgingResult,
  getSlaAging,
} from '@/lib/actions/report-actions'
import { exportToCsv, exportToExcel, exportToPdf } from '@/lib/utils/export-advanced'
import { ExportDropdown } from '@/components/ui/export-dropdown'
import { ExportConfirmDialog } from '@/components/ui/export-confirm-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { TableToolbar } from '@/components/ui/table-toolbar'
import { TableShell } from '@/components/ui/table-shell'
import { PrintButton } from '@/components/ui/print-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { KpiGrid } from '@/components/ui/kpi-grid'
import { KpiValue } from '@/components/ui/kpi-value'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { formatDateTime, cn } from '@/lib/utils'

type Period = 7 | 30 | 90 | 'all'

type SortKey = 'label' | 'resolved' | 'rejected' | 'written_off' | 'total_actioned' | 'avg_time_hours'

export function SlaAgingTable({ initialResult }: { initialResult: SlaAgingResult }) {
  const [period, setPeriod] = useState<Period>(30)
  const [result, setResult] = useState<SlaAgingResult>(initialResult)
  const [isLoading, setIsLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'label', direction: 'asc' })
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [pendingAction, setPendingAction] = useState<{
    type: 'print' | 'export'
    format?: 'csv' | 'excel' | 'pdf'
  } | null>(null)

  const refetch = async (next: Period) => {
    setIsLoading(true)
    try {
      const res = await getSlaAging(next)
      setResult(res)
      setSelectedIds([])
    } finally {
      setIsLoading(false)
    }
  }

  const handlePeriodChange = (val: string | null) => {
    if (!val) return
    const next: Period = val === 'all' ? 'all' : (Number(val) as 7 | 30 | 90)
    if (next === period) return
    setPeriod(next)
    refetch(next)
  }

  const filteredData = useMemo(() => {
    const s = search.toLowerCase()
    return result.buckets.filter((b) => b.label.toLowerCase().includes(s) || b.bucket_key.toLowerCase().includes(s))
  }, [result.buckets, search])

  const sortedData = useMemo(() => {
    const items = [...filteredData]
    items.sort((a, b) => {
      const av = a[sortConfig.key]
      const bv = b[sortConfig.key]
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortConfig.direction === 'asc' ? av - bv : bv - av
      }
      const cmp = String(av).localeCompare(String(bv))
      return sortConfig.direction === 'asc' ? cmp : -cmp
    })
    return items
  }, [filteredData, sortConfig])

  const requestSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc'
    setSortConfig({ key, direction })
  }

  const toggleOne = (key: string) => {
    setSelectedIds((prev) => (prev.includes(key) ? prev.filter((i) => i !== key) : [...prev, key]))
  }

  const toggleAll = () => {
    if (selectedIds.length === sortedData.length) setSelectedIds([])
    else setSelectedIds(sortedData.map((b) => b.bucket_key))
  }

  const totals = useMemo(() => {
    return sortedData.reduce(
      (acc, b) => ({
        resolved: acc.resolved + b.resolved,
        rejected: acc.rejected + b.rejected,
        written_off: acc.written_off + b.written_off,
        total_actioned: acc.total_actioned + b.total_actioned,
      }),
      { resolved: 0, rejected: 0, written_off: 0, total_actioned: 0 }
    )
  }, [sortedData])

  const generateExportData = (scope: 'all' | 'selected' = 'all') => {
    const rows = scope === 'selected'
      ? sortedData.filter((b) => selectedIds.includes(b.bucket_key))
      : sortedData
    return rows.map((b) => ({
      'Age Bucket': b.label,
      Resolved: b.resolved,
      Rejected: b.rejected,
      'Written Off': b.written_off,
      'Total Actioned': b.total_actioned,
      'Avg Time (hrs)': b.avg_time_hours.toFixed(1),
      'SLA Met': b.sla_met ? 'Yes' : 'No',
    }))
  }

  const dateStr = new Date().toISOString().split('T')[0]

  const executeAction = (scope: 'all' | 'selected') => {
    if (!pendingAction) return
    const exportData = generateExportData(scope)
    const suffix = scope === 'selected' ? '-selected' : ''
    const title = `Resolution SLA Aging${scope === 'selected' ? ' (Selected)' : ''}`
    const sub = `SLA Met: ${result.totals.sla_met_pct.toFixed(1)}% | ${result.totals.items_actioned} items actioned`

    if (pendingAction.type === 'print') {
      exportToPdf(`payment-sla-aging-print-${dateStr}${suffix}`, title, sub, exportData, 'landscape', true)
    } else if (pendingAction.type === 'export') {
      if (pendingAction.format === 'csv') exportToCsv(`payment-sla-aging-${dateStr}${suffix}`, exportData)
      else if (pendingAction.format === 'excel') exportToExcel(`payment-sla-aging-${dateStr}${suffix}`, exportData, title)
      else if (pendingAction.format === 'pdf') exportToPdf(`payment-sla-aging-${dateStr}${suffix}`, title, sub, exportData)
    }

    if (scope === 'selected') toast.success(`Exported ${selectedIds.length} rows`)
    setPendingAction(null)
  }

  const handleGlobalPrint = () => {
    if (selectedIds.length > 0) setPendingAction({ type: 'print' })
    else exportToPdf(`payment-sla-aging-print-${dateStr}`, 'Resolution SLA Aging', `SLA Met: ${result.totals.sla_met_pct.toFixed(1)}%`, generateExportData('all'), 'landscape', true)
  }

  const handleGlobalExport = (format: 'csv' | 'excel' | 'pdf') => {
    if (selectedIds.length > 0) setPendingAction({ type: 'export', format })
    else {
      const title = 'Resolution SLA Aging'
      const sub = `SLA Met: ${result.totals.sla_met_pct.toFixed(1)}% | ${result.totals.items_actioned} items actioned`
      if (format === 'csv') exportToCsv(`payment-sla-aging-${dateStr}`, generateExportData('all'))
      if (format === 'excel') exportToExcel(`payment-sla-aging-${dateStr}`, generateExportData('all'), title)
      if (format === 'pdf') exportToPdf(`payment-sla-aging-${dateStr}`, title, sub, generateExportData('all'))
    }
  }

  const isEmpty = result.totals.items_actioned === 0

  return (
    <div className="space-y-md">
      <KpiGrid>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Items Actioned</CardTitle></CardHeader>
          <CardContent><KpiValue>{result.totals.items_actioned}</KpiValue></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">SLA Met %</CardTitle></CardHeader>
          <CardContent>
            <KpiValue className={result.totals.sla_met_pct >= 90 ? 'text-emerald-600' : result.totals.sla_met_pct >= 75 ? 'text-amber-600' : 'text-destructive'}>
              {result.totals.sla_met_pct.toFixed(1)}%
            </KpiValue>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle></CardHeader>
          <CardContent><KpiValue>{result.totals.avg_resolution_hours.toFixed(1)}h</KpiValue></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Breached Count</CardTitle></CardHeader>
          <CardContent><KpiValue className={result.totals.breached_count > 0 ? 'text-destructive' : undefined}>{result.totals.breached_count}</KpiValue></CardContent>
        </Card>
      </KpiGrid>

      <TableToolbar
        title="Resolution SLA Aging"
        subtitle={`${result.period_label} · Computed: ${formatDateTime(result.computed_at)}`}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search bucket..."
        filterSlot={
          <div className="flex items-center gap-2 flex-wrap">
            <div className="hidden md:flex items-center rounded-md border border-border overflow-hidden h-9">
              {([7, 30, 90] as const).map((p) => (
                <Button key={p} variant="ghost" onClick={() => handlePeriodChange(String(p))}
                  className={cn('h-9 rounded-none px-3 text-xs font-medium', period === p && 'bg-primary text-primary-foreground hover:bg-primary/90')}>
                  {p}D
                </Button>
              ))}
              <Button variant="ghost" onClick={() => handlePeriodChange('all')}
                className={cn('h-9 rounded-none px-3 text-xs font-medium border-l border-border', period === 'all' && 'bg-primary text-primary-foreground hover:bg-primary/90')}>
                All
              </Button>
            </div>
            <div className="md:hidden">
              <Select value={String(period)} onValueChange={handlePeriodChange}>
                <SelectTrigger className="w-full h-9 bg-card text-xs">
                  <SelectValue>
                    {period === 'all' ? 'All Time' : `Last ${period} Days`}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 Days</SelectItem>
                  <SelectItem value="30">Last 30 Days</SelectItem>
                  <SelectItem value="90">Last 90 Days</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        }
        actions={
          <div className="flex items-center gap-2 w-full @[600px]:w-auto justify-end">
            <PrintButton onClick={handleGlobalPrint} disabled={isEmpty} />
            <div className="shrink-0">
              <ExportDropdown
                onExportCsv={() => handleGlobalExport('csv')}
                onExportExcel={() => handleGlobalExport('excel')}
                onExportPdf={() => handleGlobalExport('pdf')}
                disabled={isEmpty}
              />
            </div>
          </div>
        }
        selectionCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
        bulkActionSlot={
          <ExportDropdown
            onExportCsv={() => { exportToCsv(`payment-sla-aging-selected-${dateStr}`, generateExportData('selected')); setSelectedIds([]) }}
            onExportExcel={() => { exportToExcel(`payment-sla-aging-selected-${dateStr}`, generateExportData('selected'), 'Resolution SLA Aging (Selected)'); setSelectedIds([]) }}
            onExportPdf={() => { exportToPdf(`payment-sla-aging-selected-${dateStr}`, 'Resolution SLA Aging (Selected)', `SLA Met: ${result.totals.sla_met_pct.toFixed(1)}%`, generateExportData('selected')); setSelectedIds([]) }}
          />
        }
      />

      <div className={cn(isLoading && 'opacity-50 pointer-events-none transition-opacity')}>
        <TableShell>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[40px] text-center">
                <Checkbox checked={selectedIds.length > 0 && selectedIds.length === sortedData.length} onCheckedChange={toggleAll} />
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground" onClick={() => requestSort('label')}>
                <div className="flex items-center gap-xs">Age Bucket <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground text-right" onClick={() => requestSort('resolved')}>
                <div className="flex items-center justify-end gap-xs">Resolved <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground text-right" onClick={() => requestSort('rejected')}>
                <div className="flex items-center justify-end gap-xs">Rejected <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground text-right" onClick={() => requestSort('written_off')}>
                <div className="flex items-center justify-end gap-xs">Written Off <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground text-right" onClick={() => requestSort('total_actioned')}>
                <div className="flex items-center justify-end gap-xs">Total <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground text-right" onClick={() => requestSort('avg_time_hours')}>
                <div className="flex items-center justify-end gap-xs">Avg Time <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="text-paragraph-small font-medium text-muted-foreground">SLA Met?</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isEmpty ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-paragraph-small text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Inbox className="h-8 w-8 text-muted-foreground" />
                    <p>No items actioned in the selected period.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              sortedData.map((b) => (
                <TableRow key={b.bucket_key} className="hover:bg-muted/50">
                  <TableCell className="text-center">
                    <Checkbox checked={selectedIds.includes(b.bucket_key)} onCheckedChange={() => toggleOne(b.bucket_key)} />
                  </TableCell>
                  <TableCell className="text-paragraph-small text-foreground font-medium">{b.label}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums text-paragraph-small text-foreground">{b.resolved}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums text-paragraph-small text-foreground">{b.rejected}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums text-paragraph-small text-foreground">{b.written_off}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums text-paragraph-small text-foreground">{b.total_actioned}</TableCell>
                  <TableCell className="text-right tabular-nums text-paragraph-small text-muted-foreground">{b.avg_time_hours.toFixed(1)}h</TableCell>
                  <TableCell>
                    {b.total_actioned === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : b.sla_met ? (
                      <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200">Met</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">Breach</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {!isEmpty && (
            <TableFooter className="bg-muted/80 border-t border-border">
              <TableRow>
                <TableCell colSpan={2} className="font-bold text-foreground text-paragraph-small text-right">Total:</TableCell>
                <TableCell className="text-right font-bold tabular-nums text-paragraph-small text-foreground">{totals.resolved}</TableCell>
                <TableCell className="text-right font-bold tabular-nums text-paragraph-small text-foreground">{totals.rejected}</TableCell>
                <TableCell className="text-right font-bold tabular-nums text-paragraph-small text-foreground">{totals.written_off}</TableCell>
                <TableCell className="text-right font-bold tabular-nums text-paragraph-small text-foreground">{totals.total_actioned}</TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            </TableFooter>
          )}
        </TableShell>
      </div>

      <ExportConfirmDialog
        open={!!pendingAction}
        onOpenChange={(open) => !open && setPendingAction(null)}
        actionType={pendingAction?.type || 'export'}
        selectedCount={selectedIds.length}
        totalCount={sortedData.length}
        onConfirm={executeAction}
      />
    </div>
  )
}