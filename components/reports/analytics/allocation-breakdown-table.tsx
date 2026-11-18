'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { TableShell } from '@/components/ui/table-shell'
import { PrintButton } from '@/components/ui/print-button'
import { ExportDropdown } from '@/components/ui/export-dropdown'
import { TableToolbar } from '@/components/ui/table-toolbar'
import { DataTablePagination } from '@/components/ui/data-table-pagination'
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
  AllocationBreakdownResult,
  getAllocationBreakdown,
} from '@/lib/actions/report-actions'
import { exportToCsv, exportToExcel, exportToPdf } from '@/lib/utils/export-advanced'
import { formatCurrency, cn } from '@/lib/utils'
import { toast } from 'sonner'

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2, CURRENT_YEAR - 3]

export function AllocationBreakdownTable({
  initialResult,
}: {
  initialResult: AllocationBreakdownResult
}) {
  const [result, setResult] = useState<AllocationBreakdownResult>(initialResult)
  const [year, setYear] = useState<number>(CURRENT_YEAR)
  const [isLoading, setIsLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 15

  const refetch = async (nextYear: number) => {
    setIsLoading(true)
    try {
      const start = new Date(nextYear, 0, 1)
      const end = new Date(nextYear, 11, 31, 23, 59, 59)
      const next = await getAllocationBreakdown(start, end)
      setResult(next)
      setCurrentPage(1)
    } finally {
      setIsLoading(false)
    }
  }

  const handleYearChange = (val: string | null) => {
    if (!val) return
    const y = Number(val)
    if (y === year) return
    setYear(y)
    refetch(y)
  }

  const totalPages = Math.ceil(result.rows.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const paginatedData = result.rows.slice(startIndex, startIndex + rowsPerPage)

  const generateExportData = () =>
    result.rows.map((row) => ({
      'Billing Year': row.billingYear,
      Bucket: row.bucket,
      'Allocated (KES)': row.allocated,
      'Allocations Count': row.allocationsCount,
    }))

  const dateStr = new Date().toISOString().split('T')[0]

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    const exportData = generateExportData()
    if (exportData.length === 0) return
    if (format === 'csv')
      exportToCsv(`allocation-breakdown-${year}-${dateStr}`, exportData)
    else if (format === 'excel')
      exportToExcel(
        `allocation-breakdown-${year}-${dateStr}`,
        exportData,
        `Allocation Breakdown ${year}`
      )
    else if (format === 'pdf')
      exportToPdf(
        `allocation-breakdown-${year}-${dateStr}`,
        `Allocation Breakdown ${year}`,
        `Discrepancy: ${formatCurrency(result.discrepancy)}`,
        exportData
      )
    toast.success(`Exported ${exportData.length} rows`)
  }

  const handlePrint = () => {
    if (result.rows.length === 0) return
    exportToPdf(
      `allocation-breakdown-print-${year}-${dateStr}`,
      `Allocation Breakdown ${year}`,
      `Discrepancy: ${formatCurrency(result.discrepancy)}`,
      generateExportData(),
      'landscape',
      true
    )
  }

  const hasDiscrepancy = Math.abs(result.discrepancy) > 0.01

  return (
    <div className={cn('space-y-md', isLoading && 'opacity-50 pointer-events-none transition-opacity')}>
            <TableToolbar
        title="Allocation Breakdown"
        subtitle={`Aggregated by billing year × bucket for ${year}`}
        search=""
        onSearchChange={() => {}}
        filterSlot={
          <Select value={String(year)} onValueChange={handleYearChange}>
            <SelectTrigger className="w-full sm:w-[150px] h-9 bg-card text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEAR_OPTIONS.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            <TableHead className="text-paragraph-small font-medium text-muted-foreground">Billing Year</TableHead>
            <TableHead className="text-paragraph-small font-medium text-muted-foreground">Bucket</TableHead>
            <TableHead className="text-paragraph-small font-medium text-muted-foreground text-right">Allocated</TableHead>
            <TableHead className="text-paragraph-small font-medium text-muted-foreground text-right">Allocations</TableHead>
            <TableHead className="text-paragraph-small font-medium text-muted-foreground text-right">Payments in Scope</TableHead>
            <TableHead className="text-paragraph-small font-medium text-muted-foreground text-right">Total Received</TableHead>
            <TableHead className="text-paragraph-small font-medium text-muted-foreground text-right">Discrepancy</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-12 text-paragraph-small text-muted-foreground">
                No allocations recorded for {year}.
              </TableCell>
            </TableRow>
          ) : (
            paginatedData.map((row) => (
              <TableRow key={`${row.billingYear}-${row.bucket}`} className="hover:bg-muted/50">
                <TableCell className="font-medium text-foreground text-paragraph-small">
                  {row.billingYear}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                    {row.bucket}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums text-paragraph-small text-foreground">
                  {formatCurrency(row.allocated)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-paragraph-small text-muted-foreground">
                  {row.allocationsCount}
                </TableCell>
                <TableCell className="text-right tabular-nums text-paragraph-small text-muted-foreground">—</TableCell>
                <TableCell className="text-right tabular-nums text-paragraph-small text-muted-foreground">—</TableCell>
                <TableCell className="text-right tabular-nums text-paragraph-small text-muted-foreground">—</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
        <TableFooter className="bg-muted/80 border-t border-border">
          <TableRow>
            <TableCell colSpan={2} className="font-bold text-foreground text-paragraph-small text-right">
              Grand Total:
            </TableCell>
            <TableCell className="text-right font-bold tabular-nums text-paragraph-small text-foreground">
              {formatCurrency(result.totalAllocated)}
            </TableCell>
            <TableCell className="text-right font-bold tabular-nums text-paragraph-small text-muted-foreground">
              {result.rows.reduce((s, r) => s + r.allocationsCount, 0)}
            </TableCell>
            <TableCell className="text-right font-bold tabular-nums text-paragraph-small text-muted-foreground">
              {result.paymentsCount}
            </TableCell>
            <TableCell className="text-right font-bold tabular-nums text-paragraph-small text-foreground">
              {formatCurrency(result.totalReceived)}
            </TableCell>
            <TableCell
              className={cn(
                'text-right font-bold tabular-nums text-paragraph-small',
                hasDiscrepancy ? 'text-destructive' : 'text-muted-foreground'
              )}
            >
              <div className="flex items-center justify-end gap-1">
                {hasDiscrepancy && <AlertTriangle className="h-3.5 w-3.5" />}
                {formatCurrency(Math.abs(result.discrepancy))}
              </div>
            </TableCell>
          </TableRow>
        </TableFooter>
      </TableShell>

      <DataTablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={result.rows.length}
        showingItems={paginatedData.length}
        setCurrentPage={setCurrentPage}
        itemName="buckets"
      />
    </div>
  )
}