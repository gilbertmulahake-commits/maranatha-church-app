'use client'

import { useState, useMemo } from 'react'
import { ArrowUpDown, ChevronRight } from 'lucide-react'
import { RegionalScoresReportRow } from '@/lib/actions/report-actions'
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
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { RegionBreakdownDialog } from '@/components/dashboard/region-breakdown-dialog'

function tierBadgeClass(tier: RegionalScoresReportRow['incentiveTier']): string {
  if (tier === 'Tier 1') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (tier === 'Tier 2') return 'bg-blue-50 text-blue-700 border-blue-200'
  return 'bg-amber-50 text-amber-700 border-amber-200'
}

export function RegionalScoresTable({ data }: { data: RegionalScoresReportRow[] }) {
  const [search, setSearch] = useState('')
  const [sortConfig, setSortConfig] = useState<{
    key: keyof RegionalScoresReportRow
    direction: 'asc' | 'desc'
  } | null>({ key: 'rank', direction: 'asc' })

  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 15
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [pendingAction, setPendingAction] = useState<{
    type: 'print' | 'export'
    format?: 'csv' | 'excel' | 'pdf'
  } | null>(null)

  const [selected, setSelected] = useState<RegionalScoresReportRow | null>(null)

  const filteredData = useMemo(() => {
    if (!data) return []
    const s = search.toLowerCase()
    return data.filter((row) => row.regionName.toLowerCase().includes(s))
  }, [data, search])

  const sortedData = useMemo(() => {
    const items = [...filteredData]
    if (sortConfig) {
      items.sort((a, b) => {
        const av = a[sortConfig.key]
        const bv = b[sortConfig.key]
        if (av < bv) return sortConfig.direction === 'asc' ? -1 : 1
        if (av > bv) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }
    return items
  }, [filteredData, sortConfig])

  const requestSort = (key: keyof RegionalScoresReportRow) => {
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
    else setSelectedIds(paginatedData.map((r) => r.regionId))
  }

  const toggleOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const totals = useMemo(() => {
    return sortedData.reduce(
      (acc, row) => ({
        activeChurches: acc.activeChurches + (row.compliancePct >= 0 ? 0 : 0), // placeholder
        grossAnnual: acc.grossAnnual + row.grossOutstandingAnnual,
        grossMonthly: acc.grossMonthly + row.grossOutstandingMonthly,
        writtenOff: acc.writtenOff + row.totalWrittenOff,
        net: acc.net + row.outstandingAmount,
      }),
      { activeChurches: 0, grossAnnual: 0, grossMonthly: 0, writtenOff: 0, net: 0 }
    )
  }, [sortedData])

  const generateExportData = (scope: 'all' | 'selected' = 'all') => {
    const rowsToExport =
      scope === 'selected'
        ? sortedData.filter((r) => selectedIds.includes(r.regionId))
        : sortedData
    return rowsToExport.map((row) => ({
      Rank: row.rank,
      Region: row.regionName,
      'Compliance %': row.compliancePct.toFixed(1),
      Score: row.finalScore.toFixed(1),
      Tier: row.incentiveTier,
      'Gross Annual (KES)': row.grossOutstandingAnnual,
      'Gross Monthly (KES)': row.grossOutstandingMonthly,
      'Less Written Off (KES)': row.totalWrittenOff,
      'Net Recoverable (KES)': row.outstandingAmount,
    }))
  }

  const dateStr = new Date().toISOString().split('T')[0]

  const executeAction = (scope: 'all' | 'selected') => {
    if (!pendingAction) return
    const exportData = generateExportData(scope)
    const suffix = scope === 'selected' ? '-selected' : ''
    const titleSuffix = scope === 'selected' ? ' (Selected)' : ''

    if (pendingAction.type === 'print') {
      exportToPdf(
        `regional-scores-print-${dateStr}${suffix}`,
        `Regional Scores${titleSuffix}`,
        'Ranked by final incentive score',
        exportData,
        'landscape',
        true
      )
    } else if (pendingAction.type === 'export') {
      if (pendingAction.format === 'csv')
        exportToCsv(`regional-scores-${dateStr}${suffix}`, exportData)
      else if (pendingAction.format === 'excel')
        exportToExcel(`regional-scores-${dateStr}${suffix}`, exportData, 'Regional Scores')
      else if (pendingAction.format === 'pdf')
        exportToPdf(
          `regional-scores-${dateStr}${suffix}`,
          `Regional Scores${titleSuffix}`,
          'Ranked by final incentive score',
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
        `regional-scores-print-${dateStr}`,
        'Regional Scores',
        'Ranked by final incentive score',
        generateExportData('all'),
        'landscape',
        true
      )
  }

  const handleGlobalExport = (format: 'csv' | 'excel' | 'pdf') => {
    if (selectedIds.length > 0) setPendingAction({ type: 'export', format })
    else {
      if (format === 'csv') exportToCsv(`regional-scores-${dateStr}`, generateExportData('all'))
      if (format === 'excel')
        exportToExcel(`regional-scores-${dateStr}`, generateExportData('all'), 'Regional Scores')
      if (format === 'pdf')
        exportToPdf(
          `regional-scores-${dateStr}`,
          'Regional Scores',
          'Ranked by final incentive score',
          generateExportData('all')
        )
    }
  }

  return (
    <div className="space-y-md">
      <TableToolbar
        title="Regional Incentive Scores"
        subtitle="Score = 40% compliance; timeliness, accuracy, and engagement axes not yet instrumented."
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search regions..."

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
              exportToCsv(`regional-scores-selected-${dateStr}`, generateExportData('selected'))
              setSelectedIds([])
            }}
            onExportExcel={() => {
              exportToExcel(
                `regional-scores-selected-${dateStr}`,
                generateExportData('selected'),
                'Regional Scores (Selected)'
              )
              setSelectedIds([])
            }}
            onExportPdf={() => {
              exportToPdf(
                `regional-scores-selected-${dateStr}`,
                'Regional Scores (Selected)',
                'Ranked by final incentive score',
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
            <TableHead className="text-paragraph-small font-medium text-muted-foreground text-center w-[70px]">
              Rank
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground"
              onClick={() => requestSort('regionName')}
            >
              <div className="flex items-center gap-xs">Region <ArrowUpDown className="h-3 w-3" /></div>
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground text-right"
              onClick={() => requestSort('compliancePct')}
            >
              <div className="flex items-center justify-end gap-xs">Compliance <ArrowUpDown className="h-3 w-3" /></div>
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground text-right"
              onClick={() => requestSort('finalScore')}
            >
              <div className="flex items-center justify-end gap-xs">Score <ArrowUpDown className="h-3 w-3" /></div>
            </TableHead>
            <TableHead className="text-paragraph-small font-medium text-muted-foreground text-right">Tier</TableHead>
            <TableHead className="text-paragraph-small font-medium text-muted-foreground text-right">Gross Annual</TableHead>
            <TableHead className="text-paragraph-small font-medium text-muted-foreground text-right">Gross Monthly</TableHead>
            <TableHead className="text-paragraph-small font-medium text-muted-foreground text-right">Less WO</TableHead>
            <TableHead className="text-paragraph-small font-medium text-muted-foreground text-right">Net</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} className="text-center py-12 text-paragraph-small text-muted-foreground">
                No regional scores available.
              </TableCell>
            </TableRow>
          ) : (
            paginatedData.map((row) => (
              <TableRow key={row.regionId} className="hover:bg-muted/50">
                <TableCell className="text-center">
                  <Checkbox
                    checked={selectedIds.includes(row.regionId)}
                    onCheckedChange={() => toggleOne(row.regionId)}
                  />
                </TableCell>
                <TableCell className="text-center font-bold text-muted-foreground">{row.rank}</TableCell>
                <TableCell className="font-medium text-foreground text-paragraph-small">
                  {row.regionName}
                </TableCell>
                <TableCell className="text-right tabular-nums text-paragraph-small text-foreground">
                  {row.compliancePct.toFixed(1)}%
                </TableCell>
                <TableCell className="text-right font-bold tabular-nums text-paragraph-small text-primary">
                  {row.finalScore.toFixed(1)}
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant="outline" className={tierBadgeClass(row.incentiveTier)}>
                    {row.incentiveTier}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums text-paragraph-small text-destructive">
                  {row.grossOutstandingAnnual > 0 ? formatCurrency(row.grossOutstandingAnnual) : '-'}
                </TableCell>
                <TableCell className="text-right tabular-nums text-paragraph-small text-destructive">
                  {row.grossOutstandingMonthly > 0 ? formatCurrency(row.grossOutstandingMonthly) : '-'}
                </TableCell>
                <TableCell className="text-right tabular-nums text-paragraph-small text-amber-600">
                  {row.totalWrittenOff > 0 ? `(${formatCurrency(row.totalWrittenOff)})` : '-'}
                </TableCell>
                <TableCell className="text-right font-bold tabular-nums text-paragraph-small text-foreground">
                  {formatCurrency(row.outstandingAmount)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                    onClick={() => setSelected(row)}
                    aria-label={`View ${row.regionName} breakdown`}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
        <TableFooter className="bg-muted/80 border-t border-border">
          <TableRow>
            <TableCell colSpan={6} className="font-bold text-foreground text-paragraph-small text-right">
              Grand Total:
            </TableCell>
            <TableCell className="text-right font-bold tabular-nums text-destructive text-paragraph-small">
              {totals.grossAnnual > 0 ? formatCurrency(totals.grossAnnual) : '-'}
            </TableCell>
            <TableCell className="text-right font-bold tabular-nums text-destructive text-paragraph-small">
              {totals.grossMonthly > 0 ? formatCurrency(totals.grossMonthly) : '-'}
            </TableCell>
            <TableCell className="text-right font-bold tabular-nums text-amber-600 text-paragraph-small">
              {totals.writtenOff > 0 ? `(${formatCurrency(totals.writtenOff)})` : '-'}
            </TableCell>
            <TableCell className="text-right font-bold tabular-nums text-foreground text-paragraph-small">
              {formatCurrency(totals.net)}
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
        itemName="regions"
      />

      <ExportConfirmDialog
        open={!!pendingAction}
        onOpenChange={(open) => !open && setPendingAction(null)}
        actionType={pendingAction?.type || 'export'}
        selectedCount={selectedIds.length}
        totalCount={filteredData.length}
        onConfirm={executeAction}
      />

      <RegionBreakdownDialog
        region={selected}
        rank={selected?.rank ?? null}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}