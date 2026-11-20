'use client'

import { useState, useMemo } from 'react'
import { ArrowUpDown } from 'lucide-react'
import {
  CreditPositionResult,
  CreditPositionRow,
  RegionOption,
  getPrepaymentCreditPosition,
} from '@/lib/actions/report-actions'
import { exportToCsv, exportToExcel, exportToPdf } from '@/lib/utils/export-advanced'
import { ExportDropdown } from '@/components/ui/export-dropdown'
import { ExportConfirmDialog } from '@/components/ui/export-confirm-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { TableToolbar } from '@/components/ui/table-toolbar'
import { DataTablePagination } from '@/components/ui/data-table-pagination'
import { TableShell } from '@/components/ui/table-shell'
import { PrintButton } from '@/components/ui/print-button'
import { Badge } from '@/components/ui/badge'
import { KpiGrid } from '@/components/ui/kpi-grid'
import { KpiValue } from '@/components/ui/kpi-value'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

type SortKey =
  | 'church_code'
  | 'church_name'
  | 'region_name'
  | 'annual_credit'
  | 'monthly_credit'

export function PrepaymentCreditPositionTable({
  initialResult,
  regions,
}: {
  initialResult: CreditPositionResult
  regions: RegionOption[]
}) {
  const [regionId, setRegionId] = useState<string | undefined>(undefined)
  const [result, setResult] = useState<CreditPositionResult>(initialResult)
  const [isLoading, setIsLoading] = useState(false)

  const [search, setSearch] = useState('')
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'annual_credit',
    direction: 'desc',
  })

  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 15
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [pendingAction, setPendingAction] = useState<{
    type: 'print' | 'export'
    format?: 'csv' | 'excel' | 'pdf'
  } | null>(null)

  // ── Refetch on region change only (no period toggle) ──
  const refetch = async (nextRegionId: string | undefined) => {
    setIsLoading(true)
    try {
      const next = await getPrepaymentCreditPosition(nextRegionId)
      setResult(next)
      setCurrentPage(1)
      setSelectedIds([])
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

  // ── Filter + sort ──
  const filteredData = useMemo(() => {
    const s = search.toLowerCase()
    return result.rows.filter(
      (row: CreditPositionRow) =>
        row.church_code.toLowerCase().includes(s) ||
        row.church_name.toLowerCase().includes(s)
    )
  }, [result.rows, search])

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

  // ── Footer totals — INCLUDING defunct (D1) ──
  const totals = useMemo(() => {
    return sortedData.reduce(
      (acc, row) => ({
        annual_credit: acc.annual_credit + row.annual_credit,
        monthly_credit: acc.monthly_credit + row.monthly_credit,
      }),
      { annual_credit: 0, monthly_credit: 0 }
    )
  }, [sortedData])

  const selectedTotal = useMemo(() => {
    return sortedData
      .filter((r) => selectedIds.includes(r.church_id))
      .reduce(
        (acc, r) => ({
          annual: acc.annual + r.annual_credit,
          monthly: acc.monthly + r.monthly_credit,
        }),
        { annual: 0, monthly: 0 }
      )
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
      'Annual Credit (KES)': row.annual_credit,
      'Monthly Credit (KES)': row.monthly_credit,
      Status: row.is_defunct ? 'Defunct' : 'Active',
    }))
  }

  const dateStr = new Date().toISOString().split('T')[0]

  const executeAction = (scope: 'all' | 'selected') => {
    if (!pendingAction) return
    const exportData = generateExportData(scope)
    const suffix = scope === 'selected' ? '-selected' : ''
    const title = `Prepayment / Credit Position${scope === 'selected' ? ' (Selected)' : ''}`
    const pdfSubtitle = `Annual: ${formatCurrency(scope === 'selected' ? selectedTotal.annual : totals.annual_credit)} | Monthly: ${formatCurrency(scope === 'selected' ? selectedTotal.monthly : totals.monthly_credit)}`

    if (pendingAction.type === 'print') {
      exportToPdf(`prepayment-credit-position-print-${dateStr}${suffix}`, title, pdfSubtitle, exportData, 'landscape', true)
    } else if (pendingAction.type === 'export') {
      if (pendingAction.format === 'csv')
        exportToCsv(`prepayment-credit-position-${dateStr}${suffix}`, exportData)
      else if (pendingAction.format === 'excel')
        exportToExcel(`prepayment-credit-position-${dateStr}${suffix}`, exportData, title)
      else if (pendingAction.format === 'pdf')
        exportToPdf(`prepayment-credit-position-${dateStr}${suffix}`, title, pdfSubtitle, exportData)
    }

    if (scope === 'selected') toast.success(`Exported ${selectedIds.length} rows`)
    setPendingAction(null)
  }

  const handleGlobalPrint = () => {
    if (selectedIds.length > 0) setPendingAction({ type: 'print' })
    else exportToPdf(`prepayment-credit-position-print-${dateStr}`, 'Prepayment / Credit Position', `Annual: ${formatCurrency(totals.annual_credit)} | Monthly: ${formatCurrency(totals.monthly_credit)}`, generateExportData('all'), 'landscape', true)
  }

  const handleGlobalExport = (format: 'csv' | 'excel' | 'pdf') => {
    if (selectedIds.length > 0) setPendingAction({ type: 'export', format })
    else {
      const title = 'Prepayment / Credit Position'
      const sub = `Annual: ${formatCurrency(totals.annual_credit)} | Monthly: ${formatCurrency(totals.monthly_credit)}`
      if (format === 'csv') exportToCsv(`prepayment-credit-position-${dateStr}`, generateExportData('all'))
      if (format === 'excel') exportToExcel(`prepayment-credit-position-${dateStr}`, generateExportData('all'), title)
      if (format === 'pdf') exportToPdf(`prepayment-credit-position-${dateStr}`, title, sub, generateExportData('all'))
    }
  }

  const showEmptyHint = regions.length === 0

  return (
    <div className="space-y-md">
      {/* KPI Row */}
      <KpiGrid>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Annual Credit Total</CardTitle>
          </CardHeader>
          <CardContent>
            <KpiValue>{formatCurrency(result.total_annual_credit)}</KpiValue>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Monthly Credit Total</CardTitle>
          </CardHeader>
          <CardContent>
            <KpiValue>{formatCurrency(result.total_monthly_credit)}</KpiValue>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Churches w/ Annual Credit</CardTitle>
          </CardHeader>
          <CardContent>
            <KpiValue>{result.churches_with_annual_credit}</KpiValue>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Churches w/ Monthly Credit</CardTitle>
          </CardHeader>
          <CardContent>
            <KpiValue>{result.churches_with_monthly_credit}</KpiValue>
          </CardContent>
        </Card>
      </KpiGrid>

      <TableToolbar
        title="Prepayment / Credit Position"
        subtitle={`Per-church credit balances (cash received above accrued expectation). ${result.scope_label} · Computed: ${formatDateTime(result.computed_at)}`}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search church code or name..."
        filterSlot={
          regions.length > 0 && (
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
          )
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
              exportToCsv(`prepayment-credit-position-selected-${dateStr}`, generateExportData('selected'))
              setSelectedIds([])
            }}
            onExportExcel={() => {
              exportToExcel(`prepayment-credit-position-selected-${dateStr}`, generateExportData('selected'), 'Prepayment / Credit Position (Selected)')
              setSelectedIds([])
            }}
            onExportPdf={() => {
              exportToPdf(`prepayment-credit-position-selected-${dateStr}`, 'Prepayment / Credit Position (Selected)', `Annual: ${formatCurrency(selectedTotal.annual)} | Monthly: ${formatCurrency(selectedTotal.monthly)}`, generateExportData('selected'))
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
                <Checkbox checked={selectedIds.length > 0 && selectedIds.length === paginatedData.length} onCheckedChange={toggleAll} />
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground" onClick={() => requestSort('church_code')}>
                <div className="flex items-center gap-xs">Code <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground" onClick={() => requestSort('church_name')}>
                <div className="flex items-center gap-xs">Church <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground" onClick={() => requestSort('region_name')}>
                <div className="flex items-center gap-xs">Region <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground text-right" onClick={() => requestSort('annual_credit')}>
                <div className="flex items-center justify-end gap-xs">Annual Credit <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground text-right" onClick={() => requestSort('monthly_credit')}>
                <div className="flex items-center justify-end gap-xs">Monthly Credit <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="text-paragraph-small font-medium text-muted-foreground">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-paragraph-small text-muted-foreground">
                  <div className="space-y-2">
                    <p>No churches with credit balances in this scope.</p>
                    {showEmptyHint && <p className="text-xs">If you expected data here, verify your region assignment with National HQ.</p>}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row) => (
                <TableRow key={row.church_id} className="hover:bg-muted/50">
                  <TableCell className="text-center">
                    <Checkbox checked={selectedIds.includes(row.church_id)} onCheckedChange={() => toggleOne(row.church_id)} />
                  </TableCell>
                  <TableCell className="font-mono text-paragraph-small font-medium text-foreground">{row.church_code}</TableCell>
                  <TableCell className="text-paragraph-small text-foreground">{row.church_name}</TableCell>
                  <TableCell className="text-paragraph-small text-muted-foreground">{row.region_name}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium text-paragraph-small text-foreground">{formatCurrency(row.annual_credit)}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium text-paragraph-small text-foreground">{formatCurrency(row.monthly_credit)}</TableCell>
                  <TableCell>
                    {row.is_defunct ? <Badge variant="outline" className="text-xs">Defunct</Badge> : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          <TableFooter className="bg-muted/80 border-t border-border">
            <TableRow>
              <TableCell colSpan={4} className="font-bold text-foreground text-paragraph-small text-right">
                Total (incl. defunct):
              </TableCell>
              <TableCell className="text-right font-bold tabular-nums text-paragraph-small text-foreground">{formatCurrency(totals.annual_credit)}</TableCell>
              <TableCell className="text-right font-bold tabular-nums text-paragraph-small text-foreground">{formatCurrency(totals.monthly_credit)}</TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </TableShell>
      </div>

      <p className="text-paragraph-small text-muted-foreground">
        * Note: The &quot;prepaymentCredit&quot; column in the Collections Summary report measures future-year allocation attribution (a deferred revenue view). It is a different concept from this report&apos;s credit position (cash received above accrued expectation) and the two reports are not expected to reconcile.
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
