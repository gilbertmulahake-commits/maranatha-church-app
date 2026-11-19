'use client'

import { useState, useMemo } from 'react'
import { ArrowUpDown, AlertTriangle } from 'lucide-react'
import {
  ArrearsAgingRow,
  ArrearsAgingResult,
  RegionOption,
  getArrearsAgingReport,
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
import { Badge } from '@/components/ui/badge'
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
import { formatCurrency, formatDateTime, cn } from '@/lib/utils'

type Period = 'Annual' | 'Monthly'

type ActiveRow = {
  church_id: string
  church_code: string
  church_name: string
  region_name: string
  is_defunct: boolean
  bucket0_30: number
  bucket31_60: number
  bucket61_90: number
  bucket90_plus: number
  total_gross: number
}

type SortKey =
  | 'church_code'
  | 'church_name'
  | 'region_name'
  | 'bucket0_30'
  | 'bucket31_60'
  | 'bucket61_90'
  | 'bucket90_plus'
  | 'total_gross'

export function ArrearsAgingTable({
  initialResult,
  regions,
}: {
  initialResult: ArrearsAgingResult
  regions: RegionOption[]
}) {
  const [period, setPeriod] = useState<Period>('Annual')
  const [regionId, setRegionId] = useState<string | undefined>(undefined)
  const [result, setResult] = useState<ArrearsAgingResult>(initialResult)
  const [isLoading, setIsLoading] = useState(false)

  const [search, setSearch] = useState('')
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'total_gross',
    direction: 'desc',
  })

  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 15
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [pendingAction, setPendingAction] = useState<{
    type: 'print' | 'export'
    format?: 'csv' | 'excel' | 'pdf'
  } | null>(null)

  // ── Refetch on region change only (period is client-side) ──
  const refetch = async (nextRegionId: string | undefined) => {
    setIsLoading(true)
    try {
      const next = await getArrearsAgingReport(period, nextRegionId)
      setResult(next)
      setCurrentPage(1)
      setSelectedIds([])
    } finally {
      setIsLoading(false)
    }
  }

  const handlePeriodChange = (val: string | null) => {
    if (!val) return
    const p = val as Period
    if (p === period) return
    setPeriod(p)
    // Sort resets to Total Gross desc on period toggle — spec requirement
    setSortConfig({ key: 'total_gross', direction: 'desc' })
    setCurrentPage(1)
    setSelectedIds([])
  }

  const handleRegionChange = (val: string | null) => {
    if (!val) return
    const next = val === 'all' ? undefined : val
    if (next === regionId) return
    setRegionId(next)
    refetch(next)
  }

  // ── Derive active view from result rows ──
  const activeRows: ActiveRow[] = useMemo(() => {
    return result.rows.map((row: ArrearsAgingRow) => {
      const ledger = period === 'Annual' ? row.annual : row.monthly
      return {
        church_id: row.church_id,
        church_code: row.church_code,
        church_name: row.church_name,
        region_name: row.region_name,
        is_defunct: row.is_defunct,
        bucket0_30: ledger.bucket0_30,
        bucket31_60: ledger.bucket31_60,
        bucket61_90: ledger.bucket61_90,
        bucket90_plus: ledger.bucket90_plus,
        total_gross: ledger.total_gross,
      }
    })
  }, [result.rows, period])

  // ── Filter + sort ──
  const filteredData = useMemo(() => {
    const s = search.toLowerCase()
    return activeRows.filter(
      (row) =>
        row.church_code.toLowerCase().includes(s) ||
        row.church_name.toLowerCase().includes(s)
    )
  }, [activeRows, search])

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

  // ── Pagination ──
  const totalPages = Math.ceil(sortedData.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const paginatedData = sortedData.slice(startIndex, startIndex + rowsPerPage)

  const toggleAll = () => {
    if (selectedIds.length === paginatedData.length) setSelectedIds([])
    else setSelectedIds(paginatedData.map((r) => r.church_id))
  }

  const toggleOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  // ── Footer totals — exclude defunct ──
  const totals = useMemo(() => {
    return sortedData
      .filter((row) => !row.is_defunct)
      .reduce(
        (acc, row) => ({
          bucket0_30: acc.bucket0_30 + row.bucket0_30,
          bucket31_60: acc.bucket31_60 + row.bucket31_60,
          bucket61_90: acc.bucket61_90 + row.bucket61_90,
          bucket90_plus: acc.bucket90_plus + row.bucket90_plus,
          total_gross: acc.total_gross + row.total_gross,
        }),
        { bucket0_30: 0, bucket31_60: 0, bucket61_90: 0, bucket90_plus: 0, total_gross: 0 }
      )
  }, [sortedData])

  const selectedTotal = useMemo(() => {
    return sortedData
      .filter((r) => selectedIds.includes(r.church_id) && !r.is_defunct)
      .reduce((acc, r) => acc + r.total_gross, 0)
  }, [sortedData, selectedIds])

  // ── Export ──
  const generateExportData = (scope: 'all' | 'selected' = 'all') => {
    const rowsToExport =
      scope === 'selected'
        ? sortedData.filter((r) => selectedIds.includes(r.church_id))
        : sortedData
    return rowsToExport.map((row) => ({
      'Church Code': row.church_code,
      'Church Name': row.church_name,
      Region: row.region_name,
      '0–30 (KES)': row.bucket0_30,
      '31–60 (KES)': row.bucket31_60,
      '61–90 (KES)': row.bucket61_90,
      '90+ (KES)': row.bucket90_plus,
      'Total Gross (KES)': row.total_gross,
      Status: row.is_defunct ? 'Defunct' : 'Active',
    }))
  }

  const dateStr = new Date().toISOString().split('T')[0]

  const executeAction = (scope: 'all' | 'selected') => {
    if (!pendingAction) return
    const exportData = generateExportData(scope)
    const suffix = scope === 'selected' ? '-selected' : ''
    const totalForScope = scope === 'selected' ? selectedTotal : totals.total_gross
    const pdfSubtitle = `${period} — Total Gross: ${formatCurrency(totalForScope)}`
    const title = `${period} — Arrears Aging${scope === 'selected' ? ' (Selected)' : ''}`

    if (pendingAction.type === 'print') {
      exportToPdf(
        `arrears-aging-print-${dateStr}${suffix}`,
        title,
        pdfSubtitle,
        exportData,
        'landscape',
        true
      )
    } else if (pendingAction.type === 'export') {
      if (pendingAction.format === 'csv')
        exportToCsv(`arrears-aging-${dateStr}${suffix}`, exportData)
      else if (pendingAction.format === 'excel')
        exportToExcel(`arrears-aging-${dateStr}${suffix}`, exportData, title)
      else if (pendingAction.format === 'pdf')
        exportToPdf(`arrears-aging-${dateStr}${suffix}`, title, pdfSubtitle, exportData)
    }

    if (scope === 'selected') toast.success(`Exported ${selectedIds.length} rows`)
    setPendingAction(null)
  }

  const handleGlobalPrint = () => {
    if (selectedIds.length > 0) setPendingAction({ type: 'print' })
    else
      exportToPdf(
        `arrears-aging-print-${dateStr}`,
        `${period} — Arrears Aging`,
        `${period} — Total Gross: ${formatCurrency(totals.total_gross)}`,
        generateExportData('all'),
        'landscape',
        true
      )
  }

  const handleGlobalExport = (format: 'csv' | 'excel' | 'pdf') => {
    if (selectedIds.length > 0) setPendingAction({ type: 'export', format })
    else {
      const sub = `${period} — Total Gross: ${formatCurrency(totals.total_gross)}`
      const title = `${period} — Arrears Aging`
      if (format === 'csv')
        exportToCsv(`arrears-aging-${dateStr}`, generateExportData('all'))
      if (format === 'excel')
        exportToExcel(`arrears-aging-${dateStr}`, generateExportData('all'), title)
      if (format === 'pdf')
        exportToPdf(`arrears-aging-${dateStr}`, title, sub, generateExportData('all'))
    }
  }

  const showEmptyHint = regions.length === 0

  return (
    <div className="space-y-md">
      <TableToolbar
        title="Arrears Aging — Drillable"
        subtitle={`Gross outstanding aged by period due date (FIFO — oldest debt first). ${result.scope_label} · Computed: ${formatDateTime(result.computed_at)}`}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search church code or name..."

        filterSlot={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Desktop: period toggle as buttons */}
            <div className="hidden md:flex items-center rounded-md border border-border overflow-hidden h-9">
              <Button
                variant="ghost"
                onClick={() => handlePeriodChange('Annual')}
                className={cn(
                  'h-9 rounded-none px-3 text-xs font-medium',
                  period === 'Annual' && 'bg-primary text-primary-foreground hover:bg-primary/90'
                )}
              >
                Annual
              </Button>
              <Button
                variant="ghost"
                onClick={() => handlePeriodChange('Monthly')}
                className={cn(
                  'h-9 rounded-none px-3 text-xs font-medium border-l border-border',
                  period === 'Monthly' && 'bg-primary text-primary-foreground hover:bg-primary/90'
                )}
              >
                Monthly
              </Button>
            </div>

            {/* Mobile: period select */}
            <div className="md:hidden">
              <Select value={period} onValueChange={handlePeriodChange}>
                <SelectTrigger className="w-full h-9 bg-card text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Annual">Annual</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Region filter — hidden for non-National (regions.length === 0) */}
            {regions.length > 0 && (
              <Select value={regionId ?? 'all'} onValueChange={handleRegionChange}>
                <SelectTrigger className="w-full sm:w-[200px] h-9 bg-card text-xs">
                  <SelectValue placeholder="All Regions" />
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
                `arrears-aging-selected-${dateStr}`,
                generateExportData('selected')
              )
              setSelectedIds([])
            }}
            onExportExcel={() => {
              exportToExcel(
                `arrears-aging-selected-${dateStr}`,
                generateExportData('selected'),
                `${period} — Arrears Aging (Selected)`
              )
              setSelectedIds([])
            }}
            onExportPdf={() => {
              exportToPdf(
                `arrears-aging-selected-${dateStr}`,
                `${period} — Arrears Aging (Selected)`,
                `${period} — Total Gross: ${formatCurrency(selectedTotal)}`,
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
                  checked={
                    selectedIds.length > 0 && selectedIds.length === paginatedData.length
                  }
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground"
                onClick={() => requestSort('church_code')}
              >
                <div className="flex items-center gap-xs">
                  Code <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground"
                onClick={() => requestSort('church_name')}
              >
                <div className="flex items-center gap-xs">
                  Church <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground"
                onClick={() => requestSort('region_name')}
              >
                <div className="flex items-center gap-xs">
                  Region <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground text-right"
                onClick={() => requestSort('bucket0_30')}
              >
                <div className="flex items-center justify-end gap-xs">
                  0–30 <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground text-right"
                onClick={() => requestSort('bucket31_60')}
              >
                <div className="flex items-center justify-end gap-xs">
                  31–60 <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground text-right"
                onClick={() => requestSort('bucket61_90')}
              >
                <div className="flex items-center justify-end gap-xs">
                  61–90 <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground text-right"
                onClick={() => requestSort('bucket90_plus')}
              >
                <div className="flex items-center justify-end gap-xs">
                  90+ <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground text-right"
                onClick={() => requestSort('total_gross')}
              >
                <div className="flex items-center justify-end gap-xs">
                  Total Gross <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead className="text-paragraph-small font-medium text-muted-foreground">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="text-center py-12 text-paragraph-small text-muted-foreground"
                >
                  <div className="space-y-2">
                    <p>No churches with gross outstanding arrears in this scope.</p>
                    {showEmptyHint && (
                      <p className="text-xs">
                        If you expected data here, verify your region assignment with National
                        HQ.
                      </p>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row) => (
                <TableRow key={row.church_id} className="hover:bg-muted/50">
                  <TableCell className="text-center">
                    <Checkbox
                      checked={selectedIds.includes(row.church_id)}
                      onCheckedChange={() => toggleOne(row.church_id)}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-paragraph-small font-medium text-foreground">
                    {row.church_code}
                  </TableCell>
                  <TableCell className="text-paragraph-small text-foreground">
                    {row.church_name}
                  </TableCell>
                  <TableCell className="text-paragraph-small text-muted-foreground">
                    {row.region_name}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-paragraph-small text-foreground">
                    {formatCurrency(row.bucket0_30)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-paragraph-small text-foreground">
                    {formatCurrency(row.bucket31_60)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-paragraph-small text-foreground">
                    {formatCurrency(row.bucket61_90)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-paragraph-small">
                    {row.bucket90_plus > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-100 px-2 py-0.5 text-amber-700">
                        <AlertTriangle className="h-3 w-3" />
                        {formatCurrency(row.bucket90_plus)}
                      </span>
                    ) : (
                      <span className="text-foreground">
                        {formatCurrency(row.bucket90_plus)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-bold tabular-nums text-paragraph-small text-foreground">
                    {formatCurrency(row.total_gross)}
                  </TableCell>
                  <TableCell>
                    {row.is_defunct ? (
                      <Badge variant="outline" className="text-xs">
                        Defunct
                      </Badge>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          <TableFooter className="bg-muted/80 border-t border-border">
            <TableRow>
              <TableCell
                colSpan={4}
                className="font-bold text-foreground text-paragraph-small text-right"
              >
                Total (excl. defunct):
              </TableCell>
              <TableCell className="text-right font-bold tabular-nums text-paragraph-small text-foreground">
                {formatCurrency(totals.bucket0_30)}
              </TableCell>
              <TableCell className="text-right font-bold tabular-nums text-paragraph-small text-foreground">
                {formatCurrency(totals.bucket31_60)}
              </TableCell>
              <TableCell className="text-right font-bold tabular-nums text-paragraph-small text-foreground">
                {formatCurrency(totals.bucket61_90)}
              </TableCell>
              <TableCell className="text-right font-bold tabular-nums text-paragraph-small text-amber-600">
                {formatCurrency(totals.bucket90_plus)}
              </TableCell>
              <TableCell className="text-right font-bold tabular-nums text-paragraph-small text-foreground">
                {formatCurrency(totals.total_gross)}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </TableShell>
      </div>

      {/* Write-off disclosure — below table, not part of footer */}
      <p className="text-paragraph-small text-muted-foreground">
        Approved write-offs (church-level, not attributed to Annual or Monthly):{' '}
        {formatCurrency(result.total_written_off_in_scope)} across{' '}
        {result.churches_with_write_offs}{' '}
        {result.churches_with_write_offs === 1 ? 'church' : 'churches'}. Net Recoverable per church
        is in the Arrears Report.
      </p>

      <DataTablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={sortedData.length}
        showingItems={paginatedData.length}
        setCurrentPage={setCurrentPage}
        itemName="churches"
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