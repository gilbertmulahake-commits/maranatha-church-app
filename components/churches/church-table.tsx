'use client'

import { useState, useMemo } from 'react'
import { ArrowUpDown, MoreHorizontal, Edit, Trash2, Printer } from 'lucide-react'
import Link from 'next/link'
import { deleteChurch } from '@/lib/actions/church-actions'
import { sendBulkReminders } from '@/lib/actions/sms-actions'
import { formatPrepaidStatus } from '@/lib/utils/format'
import { exportToCsv, exportToExcel, exportToPdf } from '@/lib/utils/export-advanced'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { TableToolbar } from '@/components/ui/table-toolbar'
import { DataTablePagination } from '@/components/ui/data-table-pagination'
import { ExportDropdown } from '@/components/ui/export-dropdown'
import { ExportConfirmDialog } from '@/components/ui/export-confirm-dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuGroup
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { EditChurchDialog } from './edit-church-dialog'

export type ChurchRow = {
  id: string
  church_code: string
  church_name: string
  region: { name: string } | null
  pastor_name: string
  pastor_phone: string
  treasurer_name: string
  contact_phone: string
  annualPaid: number
  monthlyPaid: number
  annualOutstanding: number
  monthlyOutstanding: number
  annualCredit: number
  monthlyCredit: number
  annualStatus: string
  monthlyStatus: string
  status: string
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount)
}

function getStatusBadge(status: string) {
  if (status === 'Paid') return <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200">Paid</Badge>
  if (status === 'Partial') return <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">Partial</Badge>
  if (status === 'Overdue') return <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">Overdue</Badge>
  return <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200">N/A</Badge>
}

interface ChurchTableProps {
  data: ChurchRow[]
  search: string
  setSearch: (val: string) => void
  statusFilter: string
  setStatusFilter: (val: string) => void
  regionFilter: string
  setRegionFilter: (val: string) => void
  periodView: 'month' | 'year'
  setPeriodView: (val: 'month' | 'year') => void
}

export function ChurchTable({
  data, search, setSearch, statusFilter, setStatusFilter, regionFilter, setRegionFilter, periodView, setPeriodView
}: ChurchTableProps) {
  const [sortConfig, setSortConfig] = useState<{ key: keyof ChurchRow; direction: 'asc' | 'desc' } | null>({ key: 'church_name', direction: 'asc' })
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 15
  
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isBulkLoading, setIsBulkLoading] = useState(false)
  const [churchToDelete, setChurchToDelete] = useState<ChurchRow | null>(null)
  const [churchToEdit, setChurchToEdit] = useState<ChurchRow | null>(null)
  const [pendingAction, setPendingAction] = useState<{ type: 'print' | 'export', format?: 'csv' | 'excel' | 'pdf' } | null>(null)

  const sortedData = useMemo(() => {
    let sortableItems = [...data]
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key] || ''
        const bValue = b[sortConfig.key] || ''
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }
    return sortableItems
  }, [data, sortConfig])

  const requestSort = (key: keyof ChurchRow) => {
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
    else setSelectedIds(paginatedData.map(c => c.id))
  }

  const toggleOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const isMonthly = periodView === 'month'
  const paidLabel = isMonthly ? 'Monthly Paid' : 'Annual Paid'
  const outLabel = isMonthly ? 'Monthly Out' : 'Annual Out'

  const generateExportData = (scope: 'all' | 'selected' = 'all') => {
    const rowsToExport = scope === 'selected'
      ? sortedData.filter(c => selectedIds.includes(c.id))
      : sortedData

    return rowsToExport.map(c => ({
      'Church Code': c.church_code,
      'Church Name': c.church_name,
      'Region': c.region?.name || 'Unassigned',
      'Pastor': c.pastor_name,
      'Treasurer': c.treasurer_name,
      'Contact Phone': c.contact_phone,
      'Annual Paid': c.annualPaid,
      'Annual Out': c.annualOutstanding,
      'Monthly Paid': c.monthlyPaid,
      'Monthly Out': c.monthlyOutstanding,
      'Status': periodView === 'year' ? c.annualStatus : c.monthlyStatus
    }))
  }

  const dateStr = new Date().toISOString().split('T')[0]

  const executeAction = (scope: 'all' | 'selected') => {
    if (!pendingAction) return

    const exportData = generateExportData(scope)
    const suffix = scope === 'selected' ? '-selected' : ''
    const titleSuffix = scope === 'selected' ? ' (Selected)' : ''
    const sub = `Scope: ${regionFilter} | ${statusFilter} | ${periodView === 'year' ? 'Annual View' : 'Monthly View'}${scope === 'selected' ? ' | Selected Only' : ''}`

    if (pendingAction.type === 'print') {
      exportToPdf(`churches-print-${dateStr}${suffix}`, `Churches Registry${titleSuffix}`, sub, exportData, 'landscape', true)
    } else if (pendingAction.type === 'export') {
      if (pendingAction.format === 'csv') exportToCsv(`churches-${dateStr}${suffix}`, exportData)
      else if (pendingAction.format === 'excel') exportToExcel(`churches-${dateStr}${suffix}`, exportData, 'Churches Registry')
      else if (pendingAction.format === 'pdf') exportToPdf(`churches-${dateStr}${suffix}`, `Churches Registry${titleSuffix}`, sub, exportData)
    }

    if (scope === 'selected') toast.success(`Exported ${selectedIds.length} churches`)
    setPendingAction(null)
  }

  const handleGlobalPrint = () => {
    if (selectedIds.length > 0) setPendingAction({ type: 'print' })
    else {
      const sub = `Scope: ${regionFilter} | ${statusFilter} | ${periodView === 'year' ? 'Annual View' : 'Monthly View'}`
      exportToPdf(`churches-print-${dateStr}`, 'Churches Registry', sub, generateExportData('all'), 'landscape', true)
    }
  }

  const handleGlobalExport = (format: 'csv' | 'excel' | 'pdf') => {
    if (selectedIds.length > 0) setPendingAction({ type: 'export', format })
    else {
      const sub = `Scope: ${regionFilter} | ${statusFilter} | ${periodView === 'year' ? 'Annual View' : 'Monthly View'}`
      if (format === 'csv') exportToCsv(`churches-${dateStr}`, generateExportData('all'))
      if (format === 'excel') exportToExcel(`churches-${dateStr}`, generateExportData('all'), 'Churches Registry')
      if (format === 'pdf') exportToPdf(`churches-${dateStr}`, 'Churches Registry', sub, generateExportData('all'))
    }
  }

  const handleBulkReminder = async () => {
    setIsBulkLoading(true)
    try {
      const selectedChurches = data.filter(c => selectedIds.includes(c.id))
      
      const recipients = selectedChurches.map(c => ({
        phone: c.contact_phone,
        name: c.treasurer_name || c.pastor_name || 'Church Leader',
        type: 'Pastor' as const,
        annualOutstanding: c.annualOutstanding,
        monthlyOutstanding: c.monthlyOutstanding
      }))

      const res = await sendBulkReminders(recipients, 'NATIONAL', periodView)
      
      if (res?.error) throw new Error(res.error)
      
      toast.success(`Reminders sent to ${recipients.length} churches`)
      setSelectedIds([])
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reminders')
    } finally {
      setIsBulkLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!churchToDelete) return
    try {
      const res = await deleteChurch(churchToDelete.id)
      if (res.error) throw new Error(res.error)
      toast.success('Church deleted successfully')
      setChurchToDelete(null)
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const uniqueRegions = Array.from(new Set(data.map(c => c.region?.name).filter(Boolean))) as string[]

  return (
    <div className="space-y-md">
      <TableToolbar
        title="Churches"
        subtitle={`National Registry · ${data.length} total`}
        search={search}
        setSearch={setSearch}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        statusOptions={['All', 'Paid', 'Partial', 'Overdue', 'N/A']}
        periodView={periodView}
        setPeriodView={setPeriodView}
        selectionCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
        
        bulkActionSlot={
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleBulkReminder} 
              disabled={isBulkLoading}
              className="h-8 text-paragraph-small font-bold bg-primary text-primary-foreground"
            >
              {isBulkLoading ? 'Sending...' : 'Send Reminders'}
            </Button>
            <ExportDropdown 
              onExportCsv={() => { exportToCsv(`churches-selected-${dateStr}`, generateExportData('selected')); setSelectedIds([]); }}
              onExportExcel={() => { exportToExcel(`churches-selected-${dateStr}`, generateExportData('selected'), 'Selected Churches'); setSelectedIds([]); }}
              onExportPdf={() => { exportToPdf(`churches-selected-${dateStr}`, 'Churches Registry (Selected)', `Total: ${selectedIds.length}`, generateExportData('selected')); setSelectedIds([]); }}
            />
          </div>
        }

        filterSlot={
          <div className="flex items-center gap-xs w-full lg:w-auto">
            <select
              value={regionFilter}
              onChange={(e) => { setRegionFilter(e.target.value); setCurrentPage(1); }}
              className="h-9 w-full lg:w-[150px] rounded-md border border-border bg-card px-3 py-1 text-paragraph-small text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="All">All Regions</option>
              {uniqueRegions.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            
            <div className="flex items-center gap-2 ml-2">
              <Button variant="outline" onClick={handleGlobalPrint} className="h-9">
                <Printer className="mr-2 h-4 w-4" /> Print
              </Button>
              <ExportDropdown 
                onExportCsv={() => handleGlobalExport('csv')}
                onExportExcel={() => handleGlobalExport('excel')}
                onExportPdf={() => handleGlobalExport('pdf')}
                disabled={data.length === 0}
              />
            </div>
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
              <TableHead className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground" onClick={() => requestSort('church_name')}>
                <div className="flex items-center gap-xs">Church <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground" onClick={() => requestSort('region')}>
                <div className="flex items-center gap-xs">Region <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="text-paragraph-small font-medium text-muted-foreground">Pastor</TableHead>
              <TableHead className="text-paragraph-small font-medium text-muted-foreground">Treasurer</TableHead>
              <TableHead className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground text-right" onClick={() => requestSort(periodView === 'year' ? 'annualPaid' : 'monthlyPaid')}>
                <div className="flex items-center justify-end gap-xs">{paidLabel} <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground text-right" onClick={() => requestSort(periodView === 'year' ? 'annualOutstanding' : 'monthlyOutstanding')}>
                <div className="flex items-center justify-end gap-xs">{outLabel} <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="text-paragraph-small font-medium text-muted-foreground text-center">Status</TableHead>
              <TableHead className="text-paragraph-small font-medium text-muted-foreground text-center w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-paragraph-small text-muted-foreground">
                  No churches found matching your filters.
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((church) => {
                const activeStatus = periodView === 'year' ? church.annualStatus : church.monthlyStatus
                const paidAmount = periodView === 'year' ? church.annualPaid : church.monthlyPaid
                const outstandingAmount = periodView === 'year' ? church.annualOutstanding : church.monthlyOutstanding
                const credit = periodView === 'year' ? church.annualCredit : church.monthlyCredit
                
                const prepaidText = formatPrepaidStatus(credit, periodView === 'year' ? 'Annual' : 'Monthly')

                return (
                  <TableRow key={church.id} className="hover:bg-muted/50">
                    <TableCell className="text-center">
                      <Checkbox 
                        checked={selectedIds.includes(church.id)}
                        onCheckedChange={() => toggleOne(church.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Link href={`/dashboard/churches/${church.church_code}`} className="font-medium text-foreground text-paragraph-small hover:underline">
                        {church.church_name}
                      </Link>
                      <div className="font-mono text-paragraph-mini text-muted-foreground">{church.church_code}</div>
                    </TableCell>
                    <TableCell className="text-paragraph-small text-muted-foreground">{church.region?.name || 'Unassigned'}</TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground text-paragraph-small">{church.pastor_name}</div>
                      <div className="font-mono text-paragraph-mini text-muted-foreground">{church.pastor_phone}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground text-paragraph-small">{church.treasurer_name}</div>
                      <div className="font-mono text-paragraph-mini text-muted-foreground">{church.contact_phone}</div>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-emerald-600 text-paragraph-small">
                      {formatCurrency(paidAmount)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-paragraph-small">
                      {outstandingAmount > 0 ? (
                        <span className="text-destructive">{formatCurrency(outstandingAmount)}</span>
                      ) : prepaidText ? (
                        <span className="text-emerald-600">{prepaidText}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(activeStatus || 'N/A')}
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          }
                        />
                        {/* FIXED: Added w-56 to force width */}
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuGroup>
                            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Actions
                            </DropdownMenuLabel>
                          </DropdownMenuGroup>
                          <DropdownMenuItem onClick={() => setChurchToEdit(church)} className="cursor-pointer text-paragraph-small whitespace-nowrap">
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setChurchToDelete(church)} className="text-destructive cursor-pointer text-paragraph-small whitespace-nowrap">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
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
        itemName="churches"
      />

      <AlertDialog open={!!churchToDelete} onOpenChange={(open) => !open && setChurchToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-heading-3 font-bold">Delete {churchToDelete?.church_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the church and remove all associated data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {churchToEdit && (
        <EditChurchDialog
          church={churchToEdit}
          onClose={() => setChurchToEdit(null)}
        />
      )}

      <ExportConfirmDialog 
        open={!!pendingAction}
        onOpenChange={(open) => !open && setPendingAction(null)}
        actionType={pendingAction?.type || 'export'}
        selectedCount={selectedIds.length}
        totalCount={data.length}
        onConfirm={executeAction}
      />
    </div>
  )
}