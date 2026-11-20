'use client'

import { useState, useMemo } from 'react'
import { ArrowUpDown } from 'lucide-react'
import {
  CollectionsSummaryRow,
  getCollectionsSummary,
  RegionOption,
} from '@/lib/actions/report-actions'
import { exportToCsv, exportToExcel, exportToPdf } from '@/lib/utils/export-advanced'
import { ExportDropdown } from '@/components/ui/export-dropdown'
import { ExportConfirmDialog } from '@/components/ui/export-confirm-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { TableToolbar } from '@/components/ui/table-toolbar'
import { DataTablePagination } from '@/components/ui/data-table-pagination'
import { Button } from '@/components/ui/button'
import { TableShell } from '@/components/ui/table-shell'
import { PrintButton } from '@/components/ui/print-button'
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
import { toast } from 'sonner'
import { formatCurrency, cn } from '@/lib/utils'

export function CollectionsSummaryTable({
  initialData,
  regions,
}: {
  initialData: CollectionsSummaryRow[]
  regions: RegionOption[]
}) {
  const [period, setPeriod] = useState<'month' | 'year'>('month')
  const [regionId, setRegionId] = useState<string | undefined>(undefined)
  const [data, setData] = useState<CollectionsSummaryRow[]>(initialData)
  const [isLoading, setIsLoading] = useState(false)

  const [search, setSearch] = useState('')
  const [sortConfig, setSortConfig] = useState<{
    key: keyof CollectionsSummaryRow
    direction: 'asc' | 'desc'
  } | null>({ key: 'periodKey', direction: 'desc' })

  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 15
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [pendingAction, setPendingAction] = useState<{
    type: 'print' | 'export'
    format?: 'csv' | 'excel' | 'pdf'
  } | null>(null)

  // ── Refetch when filters change ──
  const refetch = async (
    nextPeriod: 'month' | 'year',
    nextRegionId: string | undefined
  ) => {
    setIsLoading(true)
    try {
      const newData = await getCollectionsSummary(nextPeriod, nextRegionId)
      setData(newData)
      setCurrentPage(1)
      setSelectedIds([])
    } finally {
      setIsLoading(false)
    }
  }

  const handlePeriodChange = (val: string | null) => {
    if (!val) return
    const p = val as 'month' | 'year'
    if (p === period) return
    setPeriod(p)
    refetch(p, regionId)
  }

  const handleRegionChange = (val: string | null) => {
    if (!val) return
    const next = val === 'all' ? undefined : val
    if (next === regionId) return
    setRegionId(next)
    refetch(period, next)
  }

  // ── Filter + sort ──
  const filteredData = useMemo(() => {
    if (!data) return []
    const s = search.toLowerCase()
    return data.filter((row) => row.periodLabel.toLowerCase().includes(s))
  }, [data, search])

  const sortedData = useMemo(() => {
    const items = [...filteredData]
    if (sortConfig) {
      items.sort((a, b) => {
        const av = a[sortConfig.key]
        const bv = b[sortConfig.key]
        if (av === null || bv === null) return 0
        if (av < bv) return sortConfig.direction === 'asc' ? -1 : 1
        if (av > bv) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }
    return items
  }, [filteredData, sortConfig])

  const requestSort = (key: keyof CollectionsSummaryRow) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  // ── Pagination ──
  const totalPages = Math.ceil(sortedData.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const paginatedData = sortedData.slice(startIndex, startIndex + rowsPerPage)

  const toggleAll = () => {
    if (selectedIds.length === paginatedData.length) setSelectedIds([])
    else setSelectedIds(paginatedData.map((r) => r.periodKey))
  }

  const toggleOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  // ── Totals (footer) ──
  const totals = useMemo(() => {
    return sortedData.reduce(
      (acc, row) => ({
        paymentsCount: acc.paymentsCount + row.paymentsCount,
        annualCollected: acc.annualCollected + row.annualCollected,
        monthlyCollected: acc.monthlyCollected + row.monthlyCollected,
        prepaymentCredit: acc.prepaymentCredit + row.prepaymentCredit,
        totalReceived: acc.totalReceived + row.totalReceived,
      }),
      {
        paymentsCount: 0,
        annualCollected: 0,
        monthlyCollected: 0,
        prepaymentCredit: 0,
        totalReceived: 0,
      }
    )
  }, [sortedData])

  const selectedTotals = useMemo(() => {
    return sortedData
      .filter((r) => selectedIds.includes(r.periodKey))
      .reduce(
        (acc, row) => ({ totalReceived: acc.totalReceived + row.totalReceived }),
        { totalReceived: 0 }
      )
  }, [sortedData, selectedIds])

  // ── Export ──
  const generateExportData = (scope: 'all' | 'selected' = 'all') => {
    const rowsToExport =
      scope === 'selected'
        ? sortedData.filter((r) => selectedIds.includes(r.periodKey))
        : sortedData
    return rowsToExport.map((row) => ({
      Period: row.periodLabel,
      'Payments (count)': row.paymentsCount,
      'Annual Collected (KES)': row.annualCollected,
      'Monthly Collected (KES)': row.monthlyCollected,
      'Prepayment Credit (KES)': row.prepaymentCredit,
      'Total Received (KES)': row.totalReceived,
    }))
  }

  const dateStr = new Date().toISOString().split('T')[0]

  const executeAction = (scope: 'all' | 'selected') => {
    if (!pendingAction) return
    const exportData = generateExportData(scope)
    const suffix = scope === 'selected' ? '-selected' : ''
    const currentTotal =
      scope === 'selected' ? selectedTotals.totalReceived : totals.totalReceived
    const pdfSubtitle = `Total Received: ${formatCurrency(currentTotal)}`
    const titleSuffix = scope === 'selected' ? ' (Selected)' : ''

    if (pendingAction.type === 'print') {
      exportToPdf(
        `collections-summary-print-${dateStr}${suffix}`,
        `Collections Summary${titleSuffix}`,
        pdfSubtitle,
        exportData,
        'landscape',
        true
      )
    } else if (pendingAction.type === 'export') {
      if (pendingAction.format === 'csv')
        exportToCsv(`collections-summary-${dateStr}${suffix}`, exportData)
      else if (pendingAction.format === 'excel')
        exportToExcel(
          `collections-summary-${dateStr}${suffix}`,
          exportData,
          'Collections Summary'
        )
      else if (pendingAction.format === 'pdf')
        exportToPdf(
          `collections-summary-${dateStr}${suffix}`,
          `Collections Summary${titleSuffix}`,
          pdfSubtitle,
          exportData
        )
    }

    if (scope === 'selected') toast.success(`Exported ${selectedIds.length} rows`)
    setPendingAction(null)
  }

  const handleGlobalPrint = () => {
    if (selectedIds.length > 0) setPendingAction({ type: 'print' })
    else
      exportToPdf(
        `collections-summary-print-${dateStr}`,
        'Collections Summary',
        `Total Received: ${formatCurrency(totals.totalReceived)}`,
        generateExportData('all'),
        'landscape',
        true
      )
  }

  const handleGlobalExport = (format: 'csv' | 'excel' | 'pdf') => {
    if (selectedIds.length > 0) setPendingAction({ type: 'export', format })
    else {
      const sub = `Total Received: ${formatCurrency(totals.totalReceived)}`
      if (format === 'csv')
        exportToCsv(`collections-summary-${dateStr}`, generateExportData('all'))
      if (format === 'excel')
        exportToExcel(
          `collections-summary-${dateStr}`,
          generateExportData('all'),
          'Collections Summary'
        )
      if (format === 'pdf')
        exportToPdf(
          `collections-summary-${dateStr}`,
          'Collections Summary',
          sub,
          generateExportData('all')
        )
    }
  }

  return (
    <div className="space-y-md">
      <TableToolbar
        title="Collections Summary"
        subtitle={`Cash received by ${period === 'month' ? 'month' : 'year'} — includes defunct churches`}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search periods..."

        filterSlot={
          <div className="flex items-center gap-2">
            {/* Desktop: period toggle as buttons (ui-context §6.1) */}
            <div className="hidden md:flex items-center rounded-md border border-border overflow-hidden h-9">
              <Button
                variant="ghost"
                onClick={() => handlePeriodChange('month')}
                className={cn(
                  'h-9 rounded-none px-3 text-xs font-medium',
                  period === 'month' && 'bg-primary text-primary-foreground hover:bg-primary/90'
                )}
              >
                Month
              </Button>
              <Button
                variant="ghost"
                onClick={() => handlePeriodChange('year')}
                className={cn(
                  'h-9 rounded-none px-3 text-xs font-medium border-l border-border',
                  period === 'year' && 'bg-primary text-primary-foreground hover:bg-primary/90'
                )}
              >
                Year
              </Button>
            </div>

            {/* Mobile: period toggle as select (ui-context §6.1) */}
            <div className="md:hidden">
              <Select value={period} onValueChange={handlePeriodChange}>
                <SelectTrigger className="w-full h-9 bg-card text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Monthly</SelectItem>
                  <SelectItem value="year">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Region filter — National only (regions.length === 0 hides it) */}
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
        }

        actions={
          <div className="flex items-center gap-2 w-full @[600px]:w-auto justify-end">
            <PrintButton onClick={handleGlobalPrint} disabled={filteredData.length === 0} />
            <div className="shrink-0">
              <ExportDropdown
                onExportCsv={() => handleGlobalExport('csv')}
                onExportExcel={() => handleGlobalExport('excel')}
                onExportPdf={() => handleGlobalExport('pdf')}
                disabled={filteredData.length === 0}
              />
            </div>
          </div>
        }

        selectionCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
        bulkActionSlot={
          <ExportDropdown
            onExportCsv={() => {
              exportToCsv(
                `collections-summary-selected-${dateStr}`,
                generateExportData('selected')
              )
              setSelectedIds([])
            }}
            onExportExcel={() => {
              exportToExcel(
                `collections-summary-selected-${dateStr}`,
                generateExportData('selected'),
                'Collections Summary (Selected)'
              )
              setSelectedIds([])
            }}
            onExportPdf={() => {
              exportToPdf(
                `collections-summary-selected-${dateStr}`,
                'Collections Summary (Selected)',
                `Total Received: ${formatCurrency(selectedTotals.totalReceived)}`,
                generateExportData('selected')
              )
              setSelectedIds([])
            }}
          />
        }
      />

      <div className={cn(isLoading && 'opacity-50 pointer-events-none transition-opacity')}>
        <TableShell>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[40px] text-center">
                <Checkbox
                  checked={selectedIds.length > 0 && selectedIds.length === paginatedData.length}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground"
                onClick={() => requestSort('periodLabel')}
              >
                <div className="flex items-center gap-xs">
                  Period <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground text-right"
                onClick={() => requestSort('paymentsCount')}
              >
                <div className="flex items-center justify-end gap-xs">
                  Payments <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground text-right"
                onClick={() => requestSort('annualCollected')}
              >
                <div className="flex items-center justify-end gap-xs">
                  Annual <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground text-right"
                onClick={() => requestSort('monthlyCollected')}
              >
                <div className="flex items-center justify-end gap-xs">
                  Monthly <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground text-right"
                onClick={() => requestSort('prepaymentCredit')}
              >
                <div className="flex items-center justify-end gap-xs">
                  Prepayment Credit <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground text-right"
                onClick={() => requestSort('totalReceived')}
              >
                <div className="flex items-center justify-end gap-xs">
                  Total Received <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-12 text-paragraph-small text-muted-foreground"
                >
                  No collections recorded for this filter.
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row) => (
                <TableRow key={row.periodKey} className="hover:bg-muted/50">
                  <TableCell className="text-center">
                    <Checkbox
                      checked={selectedIds.includes(row.periodKey)}
                      onCheckedChange={() => toggleOne(row.periodKey)}
                    />
                  </TableCell>
                  <TableCell className="text-paragraph-small font-medium text-foreground">
                    {row.periodLabel}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-paragraph-small text-muted-foreground">
                    {row.paymentsCount}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums text-paragraph-small text-foreground">
                    {formatCurrency(row.annualCollected)}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums text-paragraph-small text-foreground">
                    {formatCurrency(row.monthlyCollected)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-paragraph-small text-amber-600">
                    {row.prepaymentCredit > 0 ? formatCurrency(row.prepaymentCredit) : '-'}
                  </TableCell>
                  <TableCell className="text-right font-bold tabular-nums text-paragraph-small text-foreground">
                    {formatCurrency(row.totalReceived)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          <TableFooter className="bg-muted/80 border-t border-border">
            <TableRow>
              <TableCell
                colSpan={2}
                className="font-bold text-foreground text-paragraph-small text-right"
              >
                Grand Total:
              </TableCell>
              <TableCell className="text-right font-bold tabular-nums text-paragraph-small text-muted-foreground">
                {totals.paymentsCount}
              </TableCell>
              <TableCell className="text-right font-bold tabular-nums text-paragraph-small text-foreground">
                {formatCurrency(totals.annualCollected)}
              </TableCell>
              <TableCell className="text-right font-bold tabular-nums text-paragraph-small text-foreground">
                {formatCurrency(totals.monthlyCollected)}
              </TableCell>
              <TableCell className="text-right font-bold tabular-nums text-paragraph-small text-amber-600">
                {totals.prepaymentCredit > 0 ? formatCurrency(totals.prepaymentCredit) : '-'}
              </TableCell>
              <TableCell className="text-right font-bold tabular-nums text-paragraph-small text-foreground">
                {formatCurrency(totals.totalReceived)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </TableShell>
      </div>

      <DataTablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={sortedData.length}
        showingItems={paginatedData.length}
        setCurrentPage={setCurrentPage}
        itemName="periods"
      />

      <ExportConfirmDialog
        open={!!pendingAction}
        onOpenChange={(open) => !open && setPendingAction(null)}
        actionType={pendingAction?.type || 'export'}
        selectedCount={selectedIds.length}
        totalCount={filteredData.length}
        onConfirm={executeAction}
      />
    </div>
  )
}