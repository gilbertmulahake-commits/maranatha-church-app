'use client'

import { useState } from 'react'
import { Inbox } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { IntakeVolumeResult, getPaymentIntakeVolume } from '@/lib/actions/report-actions'
import { exportToCsv, exportToExcel, exportToPdf } from '@/lib/utils/export-advanced'
import { ExportDropdown } from '@/components/ui/export-dropdown'
import { ExportConfirmDialog } from '@/components/ui/export-confirm-dialog'
import { TableToolbar } from '@/components/ui/table-toolbar'
import { TableShell } from '@/components/ui/table-shell'
import { PrintButton } from '@/components/ui/print-button'
import { KpiGrid } from '@/components/ui/kpi-grid'
import { KpiValue } from '@/components/ui/kpi-value'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { formatCurrency, formatDateTime, cn } from '@/lib/utils'

type Period = 7 | 30 | 90 | 'all'

export function PaymentIntakeVolumeTable({ initialResult }: { initialResult: IntakeVolumeResult }) {
  const [period, setPeriod] = useState<Period>(30)
  const [result, setResult] = useState<IntakeVolumeResult>(initialResult)
  const [isLoading, setIsLoading] = useState(false)
  const [pendingAction, setPendingAction] = useState<{
    type: 'print' | 'export'
    format?: 'csv' | 'excel' | 'pdf'
  } | null>(null)

  const refetch = async (next: Period) => {
    setIsLoading(true)
    try {
      const res = await getPaymentIntakeVolume(next)
      setResult(res)
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

  const generateExportData = () => result.rows.map((r) => ({
    Date: r.date,
    'Total Webhooks': r.total_webhooks,
    'Matched (STP)': r.matched_stp,
    'Resolved Later': r.resolved_later,
    'Captured (Unmatched)': r.captured_unmatched,
    'Match Rate %': r.match_rate_pct.toFixed(1),
    'KES Received': r.kes_received,
  }))

  const dateStr = new Date().toISOString().split('T')[0]

  const executeAction = () => {
    if (!pendingAction) return
    const exportData = generateExportData()
    const title = 'Payment Intake Volume'
    const sub = `STR: ${result.totals.straight_through_rate_pct.toFixed(1)}% | Total webhooks: ${result.totals.total_webhooks}`

    if (pendingAction.type === 'print') {
      exportToPdf(`payment-intake-volume-print-${dateStr}`, title, sub, exportData, 'landscape', true)
    } else if (pendingAction.type === 'export') {
      if (pendingAction.format === 'csv') exportToCsv(`payment-intake-volume-${dateStr}`, exportData)
      else if (pendingAction.format === 'excel') exportToExcel(`payment-intake-volume-${dateStr}`, exportData, title)
      else if (pendingAction.format === 'pdf') exportToPdf(`payment-intake-volume-${dateStr}`, title, sub, exportData)
    }
    setPendingAction(null)
  }

  const handleGlobalPrint = () => {
    exportToPdf(`payment-intake-volume-print-${dateStr}`, 'Payment Intake Volume', `STR: ${result.totals.straight_through_rate_pct.toFixed(1)}%`, generateExportData(), 'landscape', true)
  }

  const handleGlobalExport = (format: 'csv' | 'excel' | 'pdf') => {
    const title = 'Payment Intake Volume'
    const sub = `STR: ${result.totals.straight_through_rate_pct.toFixed(1)}% | Total webhooks: ${result.totals.total_webhooks}`
    if (format === 'csv') exportToCsv(`payment-intake-volume-${dateStr}`, generateExportData())
    if (format === 'excel') exportToExcel(`payment-intake-volume-${dateStr}`, generateExportData(), title)
    if (format === 'pdf') exportToPdf(`payment-intake-volume-${dateStr}`, title, sub, generateExportData())
  }

  const isEmpty = result.totals.total_webhooks === 0

  return (
    <div className="space-y-md">
      <KpiGrid>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Webhooks</CardTitle></CardHeader>
          <CardContent><KpiValue>{result.totals.total_webhooks}</KpiValue></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total KES Received</CardTitle></CardHeader>
          <CardContent><KpiValue>{formatCurrency(result.totals.kes_received)}</KpiValue></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Straight-Through Rate</CardTitle></CardHeader>
          <CardContent>
            <KpiValue className={result.totals.straight_through_rate_pct >= 95 ? 'text-emerald-600' : result.totals.straight_through_rate_pct >= 85 ? 'text-amber-600' : 'text-destructive'}>
              {result.totals.straight_through_rate_pct.toFixed(1)}%
            </KpiValue>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Manual Intervention Rate</CardTitle></CardHeader>
          <CardContent><KpiValue>{result.totals.manual_intervention_rate_pct.toFixed(1)}%</KpiValue></CardContent>
        </Card>
      </KpiGrid>

      <TableToolbar
        title="Payment Intake Volume"
        subtitle={`${result.period_label} · Computed: ${formatDateTime(result.computed_at)}`}
        search=""
        onSearchChange={() => {}}
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
                  <SelectValue>{period === 'all' ? 'All Time' : `Last ${period} Days`}</SelectValue>
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
      />

      <div className={cn(isLoading && 'opacity-50 pointer-events-none transition-opacity')}>
        {!isEmpty && (
          <Card>
            <CardContent className="p-6">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={result.rows}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                    <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="matched_stp" stackId="a" fill="var(--color-emerald-500)" radius={[0, 0, 0, 0]} name="Matched (STP)" />
                    <Bar dataKey="captured_unmatched" stackId="a" fill="var(--color-amber-500)" radius={[4, 4, 0, 0]} name="Captured" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        <TableShell>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="text-paragraph-small font-medium text-muted-foreground">Date</TableHead>
              <TableHead className="text-paragraph-small font-medium text-muted-foreground text-right">Total</TableHead>
              <TableHead className="text-paragraph-small font-medium text-muted-foreground text-right">Matched (STP)</TableHead>
              <TableHead className="text-paragraph-small font-medium text-muted-foreground text-right">Resolved Later</TableHead>
              <TableHead className="text-paragraph-small font-medium text-muted-foreground text-right">Captured</TableHead>
              <TableHead className="text-paragraph-small font-medium text-muted-foreground text-right">Match Rate %</TableHead>
              <TableHead className="text-paragraph-small font-medium text-muted-foreground text-right">KES Received</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isEmpty ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-paragraph-small text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Inbox className="h-8 w-8 text-muted-foreground" />
                    <p>No webhook activity in the selected period.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              result.rows.map((r) => (
                <TableRow key={r.date} className="hover:bg-muted/50">
                  <TableCell className="text-paragraph-small text-foreground font-mono">{r.date}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums text-paragraph-small text-foreground">{r.total_webhooks}</TableCell>
                  <TableCell className="text-right tabular-nums text-paragraph-small text-emerald-600">{r.matched_stp}</TableCell>
                  <TableCell className="text-right tabular-nums text-paragraph-small text-muted-foreground">{r.resolved_later}</TableCell>
                  <TableCell className="text-right tabular-nums text-paragraph-small text-amber-600">{r.captured_unmatched}</TableCell>
                  <TableCell className="text-right tabular-nums text-paragraph-small text-foreground">{r.match_rate_pct.toFixed(1)}%</TableCell>
                  <TableCell className="text-right font-medium tabular-nums text-paragraph-small text-foreground">{formatCurrency(r.kes_received)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {!isEmpty && (
            <TableFooter className="bg-muted/80 border-t border-border">
              <TableRow>
                <TableCell className="font-bold text-foreground text-paragraph-small">Total:</TableCell>
                <TableCell className="text-right font-bold tabular-nums text-paragraph-small text-foreground">{result.totals.total_webhooks}</TableCell>
                <TableCell className="text-right font-bold tabular-nums text-paragraph-small text-foreground">{result.totals.matched_stp}</TableCell>
                <TableCell className="text-right font-bold tabular-nums text-paragraph-small text-foreground">{result.totals.resolved_later}</TableCell>
                <TableCell className="text-right font-bold tabular-nums text-paragraph-small text-foreground">{result.totals.captured_unmatched}</TableCell>
                <TableCell className="text-right font-bold tabular-nums text-paragraph-small text-foreground">{result.totals.match_rate_pct.toFixed(1)}%</TableCell>
                <TableCell className="text-right font-bold tabular-nums text-paragraph-small text-foreground">{formatCurrency(result.totals.kes_received)}</TableCell>
              </TableRow>
            </TableFooter>
          )}
        </TableShell>
      </div>

      <ExportConfirmDialog
        open={!!pendingAction}
        onOpenChange={(open) => !open && setPendingAction(null)}
        actionType={pendingAction?.type || 'export'}
        selectedCount={0}
        totalCount={result.rows.length}
        onConfirm={executeAction}
      />
    </div>
  )
}