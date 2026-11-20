'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { YoYRow, getYoYComparison, RegionOption } from '@/lib/actions/report-actions'
import { exportToCsv, exportToExcel, exportToPdf } from '@/lib/utils/export-advanced'
import { formatCurrency, cn } from '@/lib/utils'
import { YoYComparisonChart, type YoYChartRow } from './yoy-comparison-chart'
import { toast } from 'sonner'

export function YoYComparisonView({
  initialData,
  regions,
}: {
  initialData: YoYRow[]
  regions: RegionOption[]
}) {
  const [data, setData] = useState(initialData)
  const [regionId, setRegionId] = useState<string | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 15

  const refetch = async (nextRegionId: string | undefined) => {
    setIsLoading(true)
    try {
      const next = await getYoYComparison(nextRegionId)
      setData(next)
      setCurrentPage(1)
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

  const chartData: YoYChartRow[] = useMemo(
    () =>
      [...data]
        .reverse()
        .map((r) => ({
          year: r.year,
          annual: r.annualCollected,
          monthly: r.monthlyCollected,
        })),
    [data]
  )

  const totalPages = Math.ceil(data.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const paginatedData = data.slice(startIndex, startIndex + rowsPerPage)

  const generateExportData = () =>
    data.map((row) => ({
      Year: row.year,
      'Annual Collected (KES)': row.annualCollected,
      'Monthly Collected (KES)': row.monthlyCollected,
      'Annual Delta (KES)': row.annualDelta ?? '',
      'Monthly Delta (KES)': row.monthlyDelta ?? '',
      'Annual %': row.annualPct !== null ? row.annualPct.toFixed(1) : '',
      'Monthly %': row.monthlyPct !== null ? row.monthlyPct.toFixed(1) : '',
    }))

  const dateStr = new Date().toISOString().split('T')[0]

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    const exportData = generateExportData()
    if (exportData.length === 0) return
    if (format === 'csv') exportToCsv(`yoy-comparison-${dateStr}`, exportData)
    else if (format === 'excel')
      exportToExcel(`yoy-comparison-${dateStr}`, exportData, 'YoY Comparison')
    else if (format === 'pdf')
      exportToPdf(`yoy-comparison-${dateStr}`, 'YoY Comparison', 'Cash received by calendar year', exportData)
    toast.success(`Exported ${exportData.length} rows`)
  }

  const handlePrint = () => {
    if (data.length === 0) return
    exportToPdf(
      `yoy-comparison-print-${dateStr}`,
      'YoY Comparison',
      'Cash received by calendar year',
      generateExportData(),
      'landscape',
      true
    )
  }

  return (
    <div className={cn('space-y-md', isLoading && 'opacity-50 pointer-events-none transition-opacity')}>
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-heading-4 font-bold text-foreground">
                Year-over-Year Collections
              </CardTitle>
              <CardDescription>
                Cash received — calendar year of payment date. Prepayments count in the year
                cash arrived.
              </CardDescription>
            </div>
            {regions.length > 0 && (
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
            )}
          </div>
        </CardHeader>
        <CardContent>
          <YoYComparisonChart data={chartData} />
        </CardContent>
      </Card>

        <TableToolbar
        title="Annual vs Monthly by Year"
        subtitle="Deltas and % compare to the prior year in scope."
        search=""
        onSearchChange={() => {}}
        actions={
          <div className="flex items-center gap-2 w-full @[600px]:w-auto justify-end">
            <PrintButton onClick={handlePrint} disabled={data.length === 0} />
            <div className="shrink-0">
              <ExportDropdown
                onExportCsv={() => handleExport('csv')}
                onExportExcel={() => handleExport('excel')}
                onExportPdf={() => handleExport('pdf')}
                disabled={data.length === 0}
              />
            </div>
          </div>
        }
      />

      <TableShell>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="text-paragraph-small font-medium text-muted-foreground">Year</TableHead>
            <TableHead className="text-paragraph-small font-medium text-muted-foreground text-right">Annual</TableHead>
            <TableHead className="text-paragraph-small font-medium text-muted-foreground text-right">Monthly</TableHead>
            <TableHead className="text-paragraph-small font-medium text-muted-foreground text-right">Annual Δ</TableHead>
            <TableHead className="text-paragraph-small font-medium text-muted-foreground text-right">Monthly Δ</TableHead>
            <TableHead className="text-paragraph-small font-medium text-muted-foreground text-right">Annual %</TableHead>
            <TableHead className="text-paragraph-small font-medium text-muted-foreground text-right">Monthly %</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-12 text-paragraph-small text-muted-foreground">
                No payments recorded for this scope.
              </TableCell>
            </TableRow>
          ) : (
            paginatedData.map((row) => (
              <TableRow key={row.year} className="hover:bg-muted/50">
                <TableCell className="font-medium text-foreground text-paragraph-small">{row.year}</TableCell>
                <TableCell className="text-right font-medium tabular-nums text-paragraph-small text-foreground">
                  {formatCurrency(row.annualCollected)}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums text-paragraph-small text-foreground">
                  {formatCurrency(row.monthlyCollected)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-paragraph-small">
                  {row.annualDelta === null ? '—' : formatCurrency(row.annualDelta)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-paragraph-small">
                  {row.monthlyDelta === null ? '—' : formatCurrency(row.monthlyDelta)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-paragraph-small">
                  {row.annualPct === null ? '—' : `${row.annualPct.toFixed(1)}%`}
                </TableCell>
                <TableCell className="text-right tabular-nums text-paragraph-small">
                  {row.monthlyPct === null ? '—' : `${row.monthlyPct.toFixed(1)}%`}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </TableShell>

      <DataTablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={data.length}
        showingItems={paginatedData.length}
        setCurrentPage={setCurrentPage}
        itemName="years"
      />
    </div>
  )
}