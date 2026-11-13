'use client'

import { useState, useMemo } from 'react'
import { ArrowUpDown, MoreHorizontal, MapPin, Eye, Edit, Printer } from 'lucide-react'
import Link from 'next/link'
import { exportToCsv, exportToExcel, exportToPdf } from '@/lib/utils/export-advanced'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { TableToolbar } from '@/components/ui/table-toolbar'
import { ExportDropdown } from '@/components/ui/export-dropdown'
import { ExportConfirmDialog } from '@/components/ui/export-confirm-dialog'
import { DataTablePagination } from '@/components/ui/data-table-pagination'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { EditRegionDialog } from './edit-region-dialog'

export type RegionRow = {
  id: string
  name: string
  chairman_name: string
  contact_phone: string
  churchCount: number
  compliancePct: number
  totalCollected: number
}

interface Props {
  data: RegionRow[]
  search: string
  setSearch: (val: string) => void
  statusFilter: string
  setStatusFilter: (val: string) => void
  currentPage: number
  setCurrentPage: (val: number) => void
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function RegionTable({
  data,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  currentPage,
  setCurrentPage,
}: Props) {
  const [sortConfig, setSortConfig] = useState<{
    key: keyof RegionRow
    direction: 'asc' | 'desc'
  } | null>({ key: 'name', direction: 'asc' })
  
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [pendingAction, setPendingAction] = useState<{ type: 'print' | 'export', format?: 'csv' | 'excel' | 'pdf' } | null>(null)
  
  // NEW: State for the Edit Region Dialog
  const [regionToEdit, setRegionToEdit] = useState<RegionRow | null>(null)
  
  const rowsPerPage = 15

  const filteredData = useMemo(() => {
    return data.filter((region) => {
      const matchesSearch = region.name.toLowerCase().includes(search.toLowerCase()) || 
                            region.chairman_name.toLowerCase().includes(search.toLowerCase())
      
      const matchesStatus = statusFilter === 'All' || 
                            (statusFilter === 'Needs Attention' && region.compliancePct < 50) ||
                            (statusFilter === 'On Track' && region.compliancePct >= 50)
      
      return matchesSearch && matchesStatus
    })
  }, [data, search, statusFilter])

  const sortedData = useMemo(() => {
    const sortableItems = [...filteredData]
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

  const requestSort = (key: keyof RegionRow) => {
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
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id])
  }

  const generateExportData = (scope: 'all' | 'selected' = 'all') => {
    const rowsToExport = scope === 'selected'
      ? sortedData.filter(r => selectedIds.includes(r.id))
      : sortedData

    return rowsToExport.map((region) => ({
      'Region Name': region.name,
      'Chairman': region.chairman_name,
      'Contact Phone': region.contact_phone,
      'Total Churches': region.churchCount,
      'Total Collected (KES)': region.totalCollected,
      'Compliance %': `${region.compliancePct.toFixed(1)}%`,
      'Status': region.compliancePct < 50 ? 'Needs Attention' : 'On Track'
    }))
  }

  const dateStr = new Date().toISOString().split('T')[0]

  const executeAction = (scope: 'all' | 'selected') => {
    if (!pendingAction) return

    const exportData = generateExportData(scope)
    const suffix = scope === 'selected' ? '-selected' : ''
    const titleSuffix = scope === 'selected' ? ' (Selected)' : ''
    const sub = `Scope: ${statusFilter} | Total Regions: ${data.length}`

    if (pendingAction.type === 'print') {
      exportToPdf(`regions-print-${dateStr}${suffix}`, `Regions Portfolio${titleSuffix}`, sub, exportData, 'landscape', true)
    } else if (pendingAction.type === 'export') {
      if (pendingAction.format === 'csv') exportToCsv(`regions-${dateStr}${suffix}`, exportData)
      else if (pendingAction.format === 'excel') exportToExcel(`regions-${dateStr}${suffix}`, exportData, 'Regions Portfolio')
      else if (pendingAction.format === 'pdf') exportToPdf(`regions-${dateStr}${suffix}`, `Regions Portfolio${titleSuffix}`, sub, exportData)
    }

    if (scope === 'selected') toast.success(`Exported ${selectedIds.length} regions`)
    setPendingAction(null)
  }

  const handleGlobalPrint = () => {
    if (selectedIds.length > 0) setPendingAction({ type: 'print' })
    else {
      const sub = `Scope: ${statusFilter} | Total Regions: ${data.length}`
      exportToPdf(`regions-print-${dateStr}`, 'Regions Portfolio', sub, generateExportData('all'), 'landscape', true)
    }
  }

  const handleGlobalExport = (format: 'csv' | 'excel' | 'pdf') => {
    if (selectedIds.length > 0) setPendingAction({ type: 'export', format })
    else {
      const sub = `Scope: ${statusFilter} | Total Regions: ${data.length}`
      if (format === 'csv') exportToCsv(`regions-${dateStr}`, generateExportData('all'))
      if (format === 'excel') exportToExcel(`regions-${dateStr}`, generateExportData('all'), 'Regions Portfolio')
      if (format === 'pdf') exportToPdf(`regions-${dateStr}`, 'Regions Portfolio', sub, generateExportData('all'))
    }
  }

  return (
    <div className="space-y-md">
      <TableToolbar
        title="Regions"
        subtitle={`Portfolio View · ${data.length} regional units`}
        search={search}
        setSearch={setSearch}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        statusOptions={['All', 'Needs Attention', 'On Track']}
        selectionCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
        bulkActionSlot={
          <ExportDropdown
            onExportCsv={() => { exportToCsv(`regions-selected-${dateStr}`, generateExportData('selected')); setSelectedIds([]); }}
            onExportExcel={() => { exportToExcel(`regions-selected-${dateStr}`, generateExportData('selected'), 'Selected Regions'); setSelectedIds([]); }}
            onExportPdf={() => { exportToPdf(`regions-selected-${dateStr}`, 'Regions Portfolio (Selected)', `Total: ${selectedIds.length}`, generateExportData('selected')); setSelectedIds([]); }}
          />
        }
        filterSlot={
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={handleGlobalPrint} className="h-9" disabled={data.length === 0}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
            <ExportDropdown 
              onExportCsv={() => handleGlobalExport('csv')}
              onExportExcel={() => handleGlobalExport('excel')}
              onExportPdf={() => handleGlobalExport('pdf')}
              disabled={data.length === 0}
            />
          </div>
        }
      />

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[40px] text-center">
                <Checkbox 
                  checked={selectedIds.length > 0 && selectedIds.length === paginatedData.length}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground" onClick={() => requestSort('name')}>
                <div className="flex items-center gap-xs">Region <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="text-paragraph-small font-medium text-muted-foreground">Chairman</TableHead>
              <TableHead className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground" onClick={() => requestSort('churchCount')}>
                <div className="flex items-center gap-xs">Churches <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground" onClick={() => requestSort('totalCollected')}>
                <div className="flex items-center gap-xs">Collected <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground" onClick={() => requestSort('compliancePct')}>
                <div className="flex items-center gap-xs">Compliance <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="text-paragraph-small font-medium text-muted-foreground">Status</TableHead>
              <TableHead className="text-right text-paragraph-small font-medium text-muted-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-paragraph-small text-muted-foreground">
                  No regions found matching your filters.
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((region) => {
                const isAtRisk = region.compliancePct < 50
                return (
                  <TableRow key={region.id} className="hover:bg-muted/50">
                    <TableCell className="text-center">
                      <Checkbox 
                        checked={selectedIds.includes(region.id)}
                        onCheckedChange={() => toggleOne(region.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Link href={`/dashboard/regions/${region.name.toLowerCase().replace(/\s+/g, '-')}`} className="font-medium text-foreground text-paragraph-small hover:underline flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {region.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="text-foreground text-paragraph-small">{region.chairman_name}</div>
                      <div className="font-mono text-paragraph-mini text-muted-foreground">{region.contact_phone}</div>
                    </TableCell>
                    <TableCell className="text-paragraph-small text-muted-foreground">
                      {region.churchCount}
                    </TableCell>
                    <TableCell className="font-medium tabular-nums text-emerald-600 text-paragraph-small">
                      {formatCurrency(region.totalCollected)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium tabular-nums text-paragraph-small w-10">{region.compliancePct.toFixed(1)}%</span>
                        <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${isAtRisk ? 'bg-destructive' : 'bg-emerald-500'}`} 
                            style={{ width: `${region.compliancePct}%` }} 
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={isAtRisk ? 'bg-red-100 text-red-700 border-red-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}>
                        {isAtRisk ? 'Needs Attention' : 'On Track'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuGroup>
                            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Actions
                            </DropdownMenuLabel>
                          </DropdownMenuGroup>
                          
                          <Link href={`/dashboard/regions/${region.name.toLowerCase().replace(/\s+/g, '-')}`}>
                            <DropdownMenuItem className="cursor-pointer text-paragraph-small whitespace-nowrap">
                              <Eye className="mr-2 h-4 w-4" /> View Details
                            </DropdownMenuItem>
                          </Link>
                          
                          <DropdownMenuSeparator />
                          
                          <DropdownMenuItem 
                            className="cursor-pointer text-paragraph-small whitespace-nowrap"
                            onClick={() => setRegionToEdit(region)}
                          >
                            <Edit className="mr-2 h-4 w-4" /> Edit Region
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

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
        totalCount={data.length}
        onConfirm={executeAction}
      />

      {regionToEdit && (
        <EditRegionDialog
          region={regionToEdit}
          onClose={() => setRegionToEdit(null)}
        />
      )}
    </div>
  )
}