'use client'

import { useState, useMemo } from 'react'
import { CheckCircle2, AlertTriangle } from 'lucide-react'
import { UnmatchedBacklogResult } from '@/lib/actions/report-actions'
import { exportToCsv, exportToExcel, exportToPdf } from '@/lib/utils/export-advanced'
import { ExportDropdown } from '@/components/ui/export-dropdown'
import { ExportConfirmDialog } from '@/components/ui/export-confirm-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { TableToolbar } from '@/components/ui/table-toolbar'
import { TableShell } from '@/components/ui/table-shell'
import { PrintButton } from '@/components/ui/print-button'
import { KpiGrid } from '@/components/ui/kpi-grid'
import { KpiValue } from '@/components/ui/kpi-value'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { formatCurrency, formatDateTime } from '@/lib/utils'

export function UnmatchedBacklogTable({ initialResult }: { initialResult: UnmatchedBacklogResult }) {
  const [result] = useState<UnmatchedBacklogResult>(initialResult)
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [pendingAction, setPendingAction] = useState<{
    type: 'print' | 'export'
    format?: 'csv' | 'excel' | 'pdf'
  } | null>(null)

  const filteredBuckets = useMemo(() => {
    const s = search.toLowerCase()
    return result.buckets.filter((b) => b.label.toLowerCase().includes(s) || b.bucket_key.toLowerCase().includes(s))
  }, [result.buckets, search])

  const toggleOne = (key: string) => {
    setSelectedIds((prev) => (prev.includes(key) ? prev.filter((i) => i !== key) : [...prev, key]))
  }

  const toggleAll = () => {
    if (selectedIds.length === filteredBuckets.length) setSelectedIds([])
    else setSelectedIds(filteredBuckets.map((b) => b.bucket_key))
  }

  const totals = useMemo(() => {
    return filteredBuckets.reduce(
      (acc, b) => ({ count: acc.count + b.count, kes_value: acc.kes_value + b.kes_value }),
      { count: 0, kes_value: 0 }
    )
  }, [filteredBuckets])

  const generateExportData = (scope: 'all' | 'selected' = 'all') => {
    const rows = scope === 'selected'
      ? filteredBuckets.filter((b) => selectedIds.includes(b.bucket_key))
      : filteredBuckets
    return rows.map((b) => ({
      'Age Bucket': b.label,
      Count: b.count,
      'KES Value': b.kes_value,
      '% of Backlog': `${b.pct_of_backlog.toFixed(1)}%`,
      'Oldest Item (hrs)': b.oldest_item_age_hours.toFixed(1),
    }))
  }

  const dateStr = new Date().toISOString().split('T')[0]

  const executeAction = (scope: 'all' | 'selected') => {
    if (!pendingAction) return
    const exportData = generateExportData(scope)
    const suffix = scope === 'selected' ? '-selected' : ''
    const title = `Unmatched Payment Backlog${scope === 'selected' ? ' (Selected)' : ''}`
    const sub = `Current backlog: ${formatCurrency(result.totals.kes_value)} across ${result.totals.count} items`

    if (pendingAction.type === 'print') {
      exportToPdf(`payment-unmatched-backlog-print-${dateStr}${suffix}`, title, sub, exportData, 'landscape', true)
    } else if (pendingAction.type === 'export') {
      if (pendingAction.format === 'csv') exportToCsv(`payment-unmatched-backlog-${dateStr}${suffix}`, exportData)
      else if (pendingAction.format === 'excel') exportToExcel(`payment-unmatched-backlog-${dateStr}${suffix}`, exportData, title)
      else if (pendingAction.format === 'pdf') exportToPdf(`payment-unmatched-backlog-${dateStr}${suffix}`, title, sub, exportData)
    }

    if (scope === 'selected') toast.success(`Exported ${selectedIds.length} rows`)
    setPendingAction(null)
  }

  const handleGlobalPrint = () => {
    if (selectedIds.length > 0) setPendingAction({ type: 'print' })
    else exportToPdf(`payment-unmatched-backlog-print-${dateStr}`, 'Unmatched Payment Backlog', `Current backlog: ${formatCurrency(result.totals.kes_value)} across ${result.totals.count} items`, generateExportData('all'), 'landscape', true)
  }

  const handleGlobalExport = (format: 'csv' | 'excel' | 'pdf') => {
    if (selectedIds.length > 0) setPendingAction({ type: 'export', format })
    else {
      const title = 'Unmatched Payment Backlog'
      const sub = `Current backlog: ${formatCurrency(result.totals.kes_value)} across ${result.totals.count} items`
      if (format === 'csv') exportToCsv(`payment-unmatched-backlog-${dateStr}`, generateExportData('all'))
      if (format === 'excel') exportToExcel(`payment-unmatched-backlog-${dateStr}`, generateExportData('all'), title)
      if (format === 'pdf') exportToPdf(`payment-unmatched-backlog-${dateStr}`, title, sub, generateExportData('all'))
    }
  }

  const isEmpty = result.buckets.every((b) => b.count === 0)

  return (
    <div className="space-y-md">
      <KpiGrid>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Current Backlog</CardTitle></CardHeader>
          <CardContent><KpiValue>{result.totals.count}</KpiValue></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Backlog Value (KES)</CardTitle></CardHeader>
          <CardContent><KpiValue>{formatCurrency(result.totals.kes_value)}</KpiValue></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Oldest Item</CardTitle></CardHeader>
          <CardContent><KpiValue className={result.totals.oldest_item_age_hours > 72 ? 'text-destructive' : undefined}>{result.totals.oldest_item_age_hours.toFixed(1)}h</KpiValue></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Breached &gt;72h</CardTitle></CardHeader>
          <CardContent><KpiValue className={result.totals.breached_72h_count > 0 ? 'text-destructive' : undefined}>{result.totals.breached_72h_count}</KpiValue></CardContent>
        </Card>
      </KpiGrid>

      <TableToolbar
        title="Unmatched Payment Backlog"
        subtitle={`Current-state snapshot. As of ${formatDateTime(result.computed_at)}`}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search bucket..."
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
            onExportCsv={() => { exportToCsv(`payment-unmatched-backlog-selected-${dateStr}`, generateExportData('selected')); setSelectedIds([]) }}
            onExportExcel={() => { exportToExcel(`payment-unmatched-backlog-selected-${dateStr}`, generateExportData('selected'), 'Unmatched Payment Backlog (Selected)'); setSelectedIds([]) }}
            onExportPdf={() => { exportToPdf(`payment-unmatched-backlog-selected-${dateStr}`, 'Unmatched Payment Backlog (Selected)', `Current backlog: ${formatCurrency(result.totals.kes_value)} across ${result.totals.count} items`, generateExportData('selected')); setSelectedIds([]) }}
          />
        }
      />

      <TableShell>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-[40px] text-center">
              <Checkbox
                checked={selectedIds.length > 0 && selectedIds.length === filteredBuckets.length}
                onCheckedChange={toggleAll}
              />
            </TableHead>
            <TableHead className="text-paragraph-small font-medium text-muted-foreground">Age Bucket</TableHead>
            <TableHead className="text-paragraph-small font-medium text-muted-foreground text-right">Count</TableHead>
            <TableHead className="text-paragraph-small font-medium text-muted-foreground text-right">KES Value</TableHead>
            <TableHead className="text-paragraph-small font-medium text-muted-foreground text-right">% of Backlog</TableHead>
            <TableHead className="text-paragraph-small font-medium text-muted-foreground text-right">Oldest Item</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isEmpty ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-12 text-paragraph-small text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                  <p>No unmatched payments in the backlog — the queue is clear.</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            filteredBuckets.map((b) => (
              <TableRow key={b.bucket_key} className="hover:bg-muted/50">
                <TableCell className="text-center">
                  <Checkbox checked={selectedIds.includes(b.bucket_key)} onCheckedChange={() => toggleOne(b.bucket_key)} />
                </TableCell>
                <TableCell className="text-paragraph-small text-foreground font-medium">{b.label}</TableCell>
                <TableCell className="text-right font-medium tabular-nums text-paragraph-small text-foreground">{b.count}</TableCell>
                <TableCell className="text-right font-medium tabular-nums text-paragraph-small text-foreground">{formatCurrency(b.kes_value)}</TableCell>
                <TableCell className="text-right tabular-nums text-paragraph-small text-muted-foreground">{b.pct_of_backlog.toFixed(1)}%</TableCell>
                <TableCell className="text-right tabular-nums text-paragraph-small text-muted-foreground">
                  {b.count > 0 ? `${b.oldest_item_age_hours.toFixed(1)}h` : '—'}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
        {!isEmpty && (
          <TableFooter className="bg-muted/80 border-t border-border">
            <TableRow>
              <TableCell colSpan={2} className="font-bold text-foreground text-paragraph-small text-right">Total:</TableCell>
              <TableCell className="text-right font-bold tabular-nums text-paragraph-small text-foreground">{totals.count}</TableCell>
              <TableCell className="text-right font-bold tabular-nums text-paragraph-small text-foreground">{formatCurrency(totals.kes_value)}</TableCell>
              <TableCell />
              <TableCell />
            </TableRow>
          </TableFooter>
        )}
      </TableShell>

      {result.oldest_item && (
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-paragraph-small text-muted-foreground">
            Oldest unresolved: <span className="font-mono font-medium text-foreground">{result.oldest_item.bank_reference}</span> — {result.oldest_item.age_hours.toFixed(1)}h
          </span>
        </div>
      )}

      <ExportConfirmDialog
        open={!!pendingAction}
        onOpenChange={(open) => !open && setPendingAction(null)}
        actionType={pendingAction?.type || 'export'}
        selectedCount={selectedIds.length}
        totalCount={filteredBuckets.length}
        onConfirm={executeAction}
      />
    </div>
  )
}