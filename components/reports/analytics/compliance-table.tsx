'use client'

import { useState, useMemo } from 'react'
import { ArrowUpDown, Eye } from 'lucide-react'
import Link from 'next/link'
import { ComplianceRow } from '@/lib/actions/report-actions'
import { exportToCsv, exportToExcel, exportToPdf } from '@/lib/utils/export-advanced'
import { ExportDropdown } from '@/components/ui/export-dropdown'
import { ExportConfirmDialog } from '@/components/ui/export-confirm-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { TableToolbar } from '@/components/ui/table-toolbar'
import { DataTablePagination } from '@/components/ui/data-table-pagination'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TableShell } from '@/components/ui/table-shell'
import { PrintButton } from '@/components/ui/print-button'
import { KpiGrid } from '@/components/ui/kpi-grid'
import { KpiValue } from '@/components/ui/kpi-value'
import { Card, CardDescription, CardHeader } from '@/components/ui/card'
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
import { formatCurrency } from '@/lib/utils'

type StatusFilter = 'all' | 'Paid' | 'Partial' | 'Overdue'

function statusBadgeClass(status: 'Paid' | 'Partial' | 'Overdue'): string {
  if (status === 'Paid') return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  if (status === 'Partial') return 'bg-amber-100 text-amber-700 border-amber-200'
  return 'bg-red-100 text-red-700 border-red-200'
}

export function ComplianceTable({ data }: { data: ComplianceRow[] }) {
  const [search, setSearch] = useState('')
  const [regionFilter, setRegionFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortConfig, setSortConfig] = useState<{
    key: keyof ComplianceRow
    direction: 'asc' | 'desc'
  } | null>({ key: 'netRecoverable', direction: 'desc' })

  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 15
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [pendingAction, setPendingAction] = useState<{
    type: 'print' | 'export'
    format?: 'csv' | 'excel' | 'pdf'
  } | null>(null)

  const regionOptions = useMemo(() => {
    const names = new Set(data.map((r) => r.region_name))
    return Array.from(names).sort()
  }, [data])

  // KPI counts — defunct excluded from denominator
  const activeRows = useMemo(() => data.filter((r) => !r.is_defunct), [data])
  const compliantCount = useMemo(
    () => activeRows.filter((r) => r.annualStatus === 'Paid' && r.monthlyStatus === 'Paid').length,
    [activeRows]
  )
  const nonCompliantCount = activeRows.length - compliantCount
  const complianceRate =
    activeRows.length > 0 ? (compliantCount / activeRows.length) * 100 : 0

  const filteredData = useMemo(() => {
    const s = search.toLowerCase()
    return data.filter((row) => {
      if (s && !row.church_code.toLowerCase().includes(s) && !row.church_name.toLowerCase().includes(s)) {
        return false
      }
      if (regionFilter !== 'all' && row.region_name !== regionFilter) return false
      if (
        statusFilter !== 'all' &&
        row.annualStatus !== statusFilter &&
        row.monthlyStatus !== statusFilter
      ) {
        return false
      }
      return true
    })
  }, [data, search, regionFilter, statusFilter])

  const sortedData = useMemo(() => {
    const items = [...filteredData]
    if (sortConfig) {
      items.sort((a, b) => {
        // Defunct always sink to the bottom regardless of sort key
        if (a.is_defunct !== b.is_defunct) return a.is_defunct ? 1 : -1
        const av = a[sortConfig.key]
        const bv = b[sortConfig.key]
        if (av < bv) return sortConfig.direction === 'asc' ? -1 : 1
        if (av > bv) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    } else {
      items.sort((a, b) => (a.is_defunct === b.is_defunct ? 0 : a.is_defunct ? 1 : -1))
    }
    return items
  }, [filteredData, sortConfig])

  const requestSort = (key: keyof ComplianceRow) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const totalPages = Math.ceil(sortedData.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const paginatedData = sortedData.slice(startIndex, startIndex + rowsPerPage)

  const toggleAll = () => {
    if (selectedIds.length === paginatedData.length) setSelectedIds([])
    else setSelectedIds(paginatedData.map((r) => r.id))
  }

  const toggleOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const totals = useMemo(() => {
    return sortedData.reduce(
      (acc, row) => ({
        grossOutstanding: acc.grossOutstanding + row.grossOutstanding,
        writtenOff: acc.writtenOff + row.writtenOff,
        netRecoverable: acc.netRecoverable + row.netRecoverable,
      }),
      { grossOutstanding: 0, writtenOff: 0, netRecoverable: 0 }
    )
  }, [sortedData])

  const selectedTotals = useMemo(() => {
    return sortedData
      .filter((r) => selectedIds.includes(r.id))
      .reduce(
        (acc, row) => ({ netRecoverable: acc.netRecoverable + row.netRecoverable }),
        { netRecoverable: 0 }
      )
  }, [sortedData, selectedIds])

  const generateExportData = (scope: 'all' | 'selected' = 'all') => {
    const rowsToExport =
      scope === 'selected'
        ? sortedData.filter((r) => selectedIds.includes(r.id))
        : sortedData
    return rowsToExport.map((row) => ({
      'Church Code': row.church_code,
      'Church Name': row.church_name,
      Region: row.region_name,
      Status: row.is_defunct ? 'Defunct' : 'Active',
      'Annual Status': row.annualStatus,
      'Monthly Status': row.monthlyStatus,
      'Annual Paid (KES)': row.annualPaid,
      'Annual Expected (KES)': row.annualExpected,
      'Monthly Paid (KES)': row.monthlyPaid,
      'Monthly Expected (KES)': row.monthlyExpected,
      'Gross Outstanding (KES)': row.grossOutstanding,
      'Less Written Off (KES)': row.writtenOff,
      'Net Recoverable (KES)': row.netRecoverable,
    }))
  }

  const dateStr = new Date().toISOString().split('T')[0]

  const executeAction = (scope: 'all' | 'selected') => {
    if (!pendingAction) return
    const exportData = generateExportData(scope)
    const suffix = scope === 'selected' ? '-selected' : ''
    const currentTotal =
      scope === 'selected' ? selectedTotals.netRecoverable : totals.netRecoverable
    const pdfSubtitle = `Total Net Recoverable: ${formatCurrency(currentTotal)}`
    const titleSuffix = scope === 'selected' ? ' (Selected)' : ''

    if (pendingAction.type === 'print') {
      exportToPdf(
        `compliance-print-${dateStr}${suffix}`,
        `Compliance Report${titleSuffix}`,
        pdfSubtitle,
        exportData,
        'landscape',
        true
      )
    } else if (pendingAction.type === 'export') {
      if (pendingAction.format === 'csv')
        exportToCsv(`compliance-${dateStr}${suffix}`, exportData)
      else if (pendingAction.format === 'excel')
        exportToExcel(`compliance-${dateStr}${suffix}`, exportData, 'Compliance Report')
      else if (pendingAction.format === 'pdf')
        exportToPdf(
          `compliance-${dateStr}${suffix}`,
          `Compliance Report${titleSuffix}`,
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
        `compliance-print-${dateStr}`,
        'Compliance Report',
        `Total Net Recoverable: ${formatCurrency(totals.netRecoverable)}`,
        generateExportData('all'),
        'landscape',
        true
      )
  }

  const handleGlobalExport = (format: 'csv' | 'excel' | 'pdf') => {
    if (selectedIds.length > 0) setPendingAction({ type: 'export', format })
    else {
      const sub = `Total Net Recoverable: ${formatCurrency(totals.netRecoverable)}`
      if (format === 'csv') exportToCsv(`compliance-${dateStr}`, generateExportData('all'))
      if (format === 'excel')
        exportToExcel(`compliance-${dateStr}`, generateExportData('all'), 'Compliance Report')
      if (format === 'pdf')
        exportToPdf(`compliance-${dateStr}`, 'Compliance Report', sub, generateExportData('all'))
    }
  }

  return (
    <div className="space-y-md">
      <KpiGrid>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-muted-foreground">
              Compliant Churches
            </CardDescription>
            <KpiValue className="text-emerald-600">{compliantCount}</KpiValue>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-muted-foreground">
              Non-Compliant
            </CardDescription>
            <KpiValue className="text-destructive">{nonCompliantCount}</KpiValue>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-muted-foreground">
              Active Churches
            </CardDescription>
            <KpiValue>{activeRows.length}</KpiValue>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-muted-foreground">
              Compliance Rate
            </CardDescription>
            <KpiValue>{complianceRate.toFixed(1)}%</KpiValue>
          </CardHeader>
        </Card>
      </KpiGrid>

      <TableToolbar
        title="Church Compliance"
        subtitle={`${filteredData.length} churches — defunct excluded from KPI denominator`}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search code or name..."

        filterSlot={
          <div className="flex items-center gap-2 flex-wrap">
            {regionOptions.length > 1 && (
              <Select value={regionFilter} onValueChange={(v) => { if (v) setRegionFilter(v) }}>
                <SelectTrigger className="w-full sm:w-[180px] h-9 bg-card text-xs">
                  <SelectValue>
                    {regionFilter === 'all' ? 'All Regions' : regionFilter}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  {regionOptions.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={statusFilter} onValueChange={(v) => { if (v) setStatusFilter(v as StatusFilter) }}>
              <SelectTrigger className="w-full sm:w-[160px] h-9 bg-card text-xs">
                <SelectValue>
                  {statusFilter === 'all' ? 'All Statuses' : statusFilter}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Partial">Partial</SelectItem>
                <SelectItem value="Overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
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
              exportToCsv(`compliance-selected-${dateStr}`, generateExportData('selected'))
              setSelectedIds([])
            }}
            onExportExcel={() => {
              exportToExcel(
                `compliance-selected-${dateStr}`,
                generateExportData('selected'),
                'Compliance (Selected)'
              )
              setSelectedIds([])
            }}
            onExportPdf={() => {
              exportToPdf(
                `compliance-selected-${dateStr}`,
                'Compliance (Selected)',
                `Total Net: ${formatCurrency(selectedTotals.netRecoverable)}`,
                generateExportData('selected')
              )
              setSelectedIds([])
            }}
          />
        }
      />

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
              onClick={() => requestSort('church_name')}
            >
              <div className="flex items-center gap-xs">Church <ArrowUpDown className="h-3 w-3" /></div>
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground"
              onClick={() => requestSort('region_name')}
            >
              <div className="flex items-center gap-xs">Region <ArrowUpDown className="h-3 w-3" /></div>
            </TableHead>
            <TableHead className="text-paragraph-small font-medium text-muted-foreground text-center">Annual</TableHead>
            <TableHead className="text-paragraph-small font-medium text-muted-foreground text-center">Monthly</TableHead>
            <TableHead
              className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground text-right"
              onClick={() => requestSort('grossOutstanding')}
            >
              <div className="flex items-center justify-end gap-xs">Gross <ArrowUpDown className="h-3 w-3" /></div>
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground text-right"
              onClick={() => requestSort('writtenOff')}
            >
              <div className="flex items-center justify-end gap-xs">Less WO <ArrowUpDown className="h-3 w-3" /></div>
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground text-right"
              onClick={() => requestSort('netRecoverable')}
            >
              <div className="flex items-center justify-end gap-xs">Net <ArrowUpDown className="h-3 w-3" /></div>
            </TableHead>
            <TableHead className="text-paragraph-small font-medium text-muted-foreground text-center w-[60px]">View</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-12 text-paragraph-small text-muted-foreground">
                No churches match the current filters.
              </TableCell>
            </TableRow>
          ) : (
            paginatedData.map((row) => (
              <TableRow key={row.id} className="hover:bg-muted/50">
                <TableCell className="text-center">
                  <Checkbox
                    checked={selectedIds.includes(row.id)}
                    onCheckedChange={() => toggleOne(row.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground text-paragraph-small">{row.church_name}</span>
                    {row.is_defunct && (
                      <Badge variant="outline" className="bg-gray-100 text-gray-700 text-[10px] h-4">
                        Defunct
                      </Badge>
                    )}
                  </div>
                  <div className="font-mono text-paragraph-mini text-muted-foreground">{row.church_code}</div>
                </TableCell>
                <TableCell className="text-paragraph-small text-muted-foreground">{row.region_name}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className={statusBadgeClass(row.annualStatus)}>
                    {row.annualStatus}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className={statusBadgeClass(row.monthlyStatus)}>
                    {row.monthlyStatus}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums text-paragraph-small text-destructive">
                  {row.grossOutstanding > 0 ? formatCurrency(row.grossOutstanding) : '-'}
                </TableCell>
                <TableCell className="text-right tabular-nums text-paragraph-small text-amber-600">
                  {row.writtenOff > 0 ? `(${formatCurrency(row.writtenOff)})` : '-'}
                </TableCell>
                <TableCell className="text-right font-bold tabular-nums text-paragraph-small text-foreground">
                  {formatCurrency(row.netRecoverable)}
                </TableCell>
                <TableCell className="text-center">
                  <Link href={`/dashboard/churches/${row.church_code}`}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
        <TableFooter className="bg-muted/80 border-t border-border">
          <TableRow>
            <TableCell colSpan={5} className="font-bold text-foreground text-paragraph-small text-right">
              Grand Total:
            </TableCell>
            <TableCell className="text-right font-bold tabular-nums text-destructive text-paragraph-small">
              {totals.grossOutstanding > 0 ? formatCurrency(totals.grossOutstanding) : '-'}
            </TableCell>
            <TableCell className="text-right font-bold tabular-nums text-amber-600 text-paragraph-small">
              {totals.writtenOff > 0 ? `(${formatCurrency(totals.writtenOff)})` : '-'}
            </TableCell>
            <TableCell className="text-right font-bold tabular-nums text-foreground text-paragraph-small">
              {formatCurrency(totals.netRecoverable)}
            </TableCell>
            <TableCell />
          </TableRow>
        </TableFooter>
      </TableShell>

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