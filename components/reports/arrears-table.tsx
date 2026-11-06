'use client'

import { useState, useMemo } from 'react'
import { ArrowUpDown, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { ArrearsRow } from '@/lib/actions/report-actions'
import { exportToCsv } from '@/lib/utils/export'
import { Button } from '@/components/ui/button'
import { TableToolbar } from '@/components/ui/table-toolbar'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function ArrearsTable({ data }: { data: ArrearsRow[] }) {
  const [search, setSearch] = useState('')
  const [sortConfig, setSortConfig] = useState<{ key: keyof ArrearsRow; direction: 'asc' | 'desc' } | null>({ key: 'totalOutstanding', direction: 'desc' })
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 15

  const filteredData = useMemo(() => {
    return data.filter((row) => {
      const s = search.toLowerCase()
      return (
        row.church_code.toLowerCase().includes(s) ||
        row.church_name.toLowerCase().includes(s) ||
        row.region_name.toLowerCase().includes(s)
      )
    })
  }, [data, search])

  const sortedData = useMemo(() => {
    let sortableItems = [...filteredData]
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key]
        const bValue = b[sortConfig.key]
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }
    return sortableItems
  }, [filteredData, sortConfig])

  const requestSort = (key: keyof ArrearsRow) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const totalPages = Math.ceil(sortedData.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const paginatedData = sortedData.slice(startIndex, startIndex + rowsPerPage)

  const grandTotalAnnual = filteredData.reduce((sum, row) => sum + row.annualOutstanding, 0)
  const grandTotalMonthly = filteredData.reduce((sum, row) => sum + row.monthlyOutstanding, 0)
  const grandTotal = grandTotalAnnual + grandTotalMonthly

  const handleExport = () => {
    const exportData = sortedData.map((row) => ({
      'Church Code': row.church_code,
      'Church Name': row.church_name,
      'Region': row.region_name,
      'Annual Outstanding (KES)': row.annualOutstanding,
      'Monthly Outstanding (KES)': row.monthlyOutstanding,
      'Total Outstanding (KES)': row.totalOutstanding,
    }))
    const date = new Date().toISOString().split('T')[0]
    exportToCsv(`arrears-report-${date}`, exportData)
  }

  return (
    <div className="space-y-md">
      <TableToolbar
        title="Outstanding Balances"
        subtitle={`${filteredData.length} churches with unpaid balances`}
        search={search}
        setSearch={setSearch}
        statusFilter="All"
        setStatusFilter={() => {}}
        filterSlot={
          <Button 
            variant="outline" 
            onClick={handleExport} 
            disabled={filteredData.length === 0}
            className="h-9"
          >
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        }
      />

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="cursor-pointer hover:bg-muted text-paragraph-small" onClick={() => requestSort('church_name')}>
                <div className="flex items-center gap-xs">Church <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted text-paragraph-small" onClick={() => requestSort('region_name')}>
                <div className="flex items-center gap-xs">Region <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="text-right text-paragraph-small cursor-pointer hover:bg-muted" onClick={() => requestSort('annualOutstanding')}>
                <div className="flex items-center justify-end gap-xs">Annual Out <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="text-right text-paragraph-small cursor-pointer hover:bg-muted" onClick={() => requestSort('monthlyOutstanding')}>
                <div className="flex items-center justify-end gap-xs">Monthly Out <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="text-right text-paragraph-small font-bold cursor-pointer hover:bg-muted" onClick={() => requestSort('totalOutstanding')}>
                <div className="flex items-center justify-end gap-xs">Total Owed <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-paragraph-small text-muted-foreground">
                  No arrears found. All churches are up to date.
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="font-medium text-foreground text-paragraph-small">{row.church_name}</div>
                    <div className="font-mono text-paragraph-mini text-muted-foreground">{row.church_code}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-paragraph-small">{row.region_name}</TableCell>
                  <TableCell className="text-right tabular-nums text-paragraph-small text-destructive">
                    {row.annualOutstanding > 0 ? formatCurrency(row.annualOutstanding) : '-'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-paragraph-small text-destructive">
                    {row.monthlyOutstanding > 0 ? formatCurrency(row.monthlyOutstanding) : '-'}
                  </TableCell>
                  <TableCell className="text-right font-bold tabular-nums text-paragraph-small text-destructive">
                    {formatCurrency(row.totalOutstanding)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          <TableFooter className="bg-muted/50 border-t-2 border-border">
            <TableRow>
              <TableCell colSpan={2} className="font-bold text-paragraph-small">Total Outstanding</TableCell>
              <TableCell className="text-right font-bold tabular-nums text-paragraph-small text-destructive">
                {formatCurrency(grandTotalAnnual)}
              </TableCell>
              <TableCell className="text-right font-bold tabular-nums text-paragraph-small text-destructive">
                {formatCurrency(grandTotalMonthly)}
              </TableCell>
              <TableCell className="text-right font-bold tabular-nums text-paragraph-small text-destructive text-base">
                {formatCurrency(grandTotal)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-paragraph-small text-muted-foreground">
          Showing {paginatedData.length} of {sortedData.length} churches
        </p>
        <div className="flex items-center gap-xs">
          <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-8 text-paragraph-small">
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <span className="text-paragraph-small text-muted-foreground">Page {currentPage} of {totalPages || 1}</span>
          <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="h-8 text-paragraph-small">
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}