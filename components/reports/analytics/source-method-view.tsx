'use client'

import { useState, useMemo } from 'react'
import { TableShell } from '@/components/ui/table-shell'
import { PrintButton } from '@/components/ui/print-button'
import { ExportDropdown } from '@/components/ui/export-dropdown'
import { TableToolbar } from '@/components/ui/table-toolbar'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  SourceMethodResult,
  RegionOption,
  getSourceMethodBreakdown,
} from '@/lib/actions/report-actions'
import { exportToCsv, exportToExcel, exportToPdf } from '@/lib/utils/export-advanced'
import { formatCurrency, cn } from '@/lib/utils'
import { getReadableMethod } from '@/components/payments/payments-table'
import { toast } from 'sonner'

export function SourceMethodView({
  initialResult,
  regions,
}: {
  initialResult: SourceMethodResult
  regions: RegionOption[]
}) {
  const [result, setResult] = useState(initialResult)
  const [regionId, setRegionId] = useState<string | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)

  const refetch = async (nextRegionId: string | undefined) => {
    setIsLoading(true)
    try {
      const next = await getSourceMethodBreakdown(nextRegionId)
      setResult(next)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegionChange = (val: string | null) => {
    if (!val) return
    const next = val === 'all' ? undefined : val
    if (next === regionId) return
    setRegionId(next)
    refetch(next)
  }

  const generateExportData = useMemo(
    () =>
      result.rows.map((row) => ({
        Source: row.source,
        [getReadableMethod('M_Pesa')]: row.mPesa,
        [getReadableMethod('Cash')]: row.cash,
        [getReadableMethod('Bank_Transfer')]: row.bankTransfer,
        [getReadableMethod('Cheque')]: row.cheque,
        Total: row.total,
      })),
    [result.rows]
  )

  const dateStr = new Date().toISOString().split('T')[0]

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    if (generateExportData.length === 0) return
    if (format === 'csv') exportToCsv(`source-method-${dateStr}`, generateExportData)
    else if (format === 'excel')
      exportToExcel(`source-method-${dateStr}`, generateExportData, 'Source & Method Breakdown')
    else if (format === 'pdf')
      exportToPdf(
        `source-method-${dateStr}`,
        'Source & Method Breakdown',
        `Grand Total: ${formatCurrency(result.totals.grandTotal)}`,
        generateExportData
      )
    toast.success(`Exported ${generateExportData.length} rows`)
  }

  const handlePrint = () => {
    if (generateExportData.length === 0) return
    exportToPdf(
      `source-method-print-${dateStr}`,
      'Source & Method Breakdown',
      `Grand Total: ${formatCurrency(result.totals.grandTotal)}`,
      generateExportData,
      'landscape',
      true
    )
  }

  return (
    <div className={cn('space-y-md', isLoading && 'opacity-50 pointer-events-none transition-opacity')}>
      <TableToolbar
        title="Source & Method Breakdown"
        subtitle="Payments only — excludes pending, unmatched, and write-offs"
        search=""
        onSearchChange={() => {}}
        filterSlot={
          regions.length > 0 ? (
            <Select value={regionId ?? 'all'} onValueChange={handleRegionChange}>
              <SelectTrigger className="w-full sm:w-[200px] h-9 bg-card text-xs">
                <SelectValue placeholder="All Regions">
                  {regionId ? regions.find((r) => r.id === regionId)?.name : 'All Regions'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {regions.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : undefined
        }
        actions={
          <div className="flex items-center gap-2 w-full @[600px]:w-auto justify-end">
            <PrintButton onClick={handlePrint} disabled={result.rows.length === 0} />
            <div className="shrink-0">
              <ExportDropdown
                onExportCsv={() => handleExport('csv')}
                onExportExcel={() => handleExport('excel')}
                onExportPdf={() => handleExport('pdf')}
                disabled={result.rows.length === 0}
              />
            </div>
          </div>
        }
      />

      <TableShell>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="text-paragraph-small font-medium text-muted-foreground">Source</TableHead>
            <TableHead className="text-paragraph-small font-medium text-muted-foreground text-right">{getReadableMethod('M_Pesa')}</TableHead>
            <TableHead className="text-paragraph-small font-medium text-muted-foreground text-right">{getReadableMethod('Cash')}</TableHead>
            <TableHead className="text-paragraph-small font-medium text-muted-foreground text-right">{getReadableMethod('Bank_Transfer')}</TableHead>
            <TableHead className="text-paragraph-small font-medium text-muted-foreground text-right">{getReadableMethod('Cheque')}</TableHead>
            <TableHead className="text-paragraph-small font-medium text-muted-foreground text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-12 text-paragraph-small text-muted-foreground">
                No payments recorded.
              </TableCell>
            </TableRow>
          ) : (
            result.rows.map((row) => (
              <TableRow key={row.source} className="hover:bg-muted/50">
                <TableCell className="font-medium text-foreground text-paragraph-small">{row.source}</TableCell>
                <TableCell className="text-right tabular-nums text-paragraph-small text-foreground">
                  {row.mPesa > 0 ? formatCurrency(row.mPesa) : '-'}
                </TableCell>
                <TableCell className="text-right tabular-nums text-paragraph-small text-foreground">
                  {row.cash > 0 ? formatCurrency(row.cash) : '-'}
                </TableCell>
                <TableCell className="text-right tabular-nums text-paragraph-small text-foreground">
                  {row.bankTransfer > 0 ? formatCurrency(row.bankTransfer) : '-'}
                </TableCell>
                <TableCell className="text-right tabular-nums text-paragraph-small text-foreground">
                  {row.cheque > 0 ? formatCurrency(row.cheque) : '-'}
                </TableCell>
                <TableCell className="text-right font-bold tabular-nums text-paragraph-small text-foreground">
                  {formatCurrency(row.total)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
        <TableFooter className="bg-muted/80 border-t border-border">
          <TableRow>
            <TableCell className="font-bold text-foreground text-paragraph-small text-right">Grand Total:</TableCell>
            <TableCell className="text-right font-bold tabular-nums text-paragraph-small text-foreground">
              {formatCurrency(result.totals.mPesa)}
            </TableCell>
            <TableCell className="text-right font-bold tabular-nums text-paragraph-small text-foreground">
              {formatCurrency(result.totals.cash)}
            </TableCell>
            <TableCell className="text-right font-bold tabular-nums text-paragraph-small text-foreground">
              {formatCurrency(result.totals.bankTransfer)}
            </TableCell>
            <TableCell className="text-right font-bold tabular-nums text-paragraph-small text-foreground">
              {formatCurrency(result.totals.cheque)}
            </TableCell>
            <TableCell className="text-right font-bold tabular-nums text-paragraph-small text-foreground">
              {formatCurrency(result.totals.grandTotal)}
            </TableCell>
          </TableRow>
        </TableFooter>
      </TableShell>
    </div>
  )
}