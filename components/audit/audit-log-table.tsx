'use client'

import { useState, useMemo } from 'react'
import { ArrowUpDown, FileJson, Eye } from 'lucide-react'
import { AuditLog } from '@prisma/client'
import { exportToCsv, exportToExcel, exportToPdf } from '@/lib/utils/export-advanced'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { TableToolbar } from '@/components/ui/table-toolbar'
import { DataTablePagination } from '@/components/ui/data-table-pagination'
import { ExportDropdown } from '@/components/ui/export-dropdown'
import { ExportConfirmDialog } from '@/components/ui/export-confirm-dialog'
import { TableShell } from '@/components/ui/table-shell'
import { PrintButton } from '@/components/ui/print-button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { formatDateTime } from '@/lib/utils' // 🚨 FIX: Global formatter

function getActionBadge(action: string) {
  if (action.includes('CREATED') || action.includes('ACTIVATED')) {
    return <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200">{action}</Badge>
  }
  if (action.includes('DELETED') || action.includes('DEACTIVATED')) {
    return <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">{action}</Badge>
  }
  if (action.includes('RECEIVED')) {
    return <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200">{action}</Badge>
  }
  if (action.includes('UPDATED') || action.includes('CHANGED') || action.includes('RESET')) {
    return <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">{action}</Badge>
  }
  return <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200">{action}</Badge>
}

export function AuditLogTable({ logs }: { logs: AuditLog[] }) {
  const [search, setSearch] = useState('')
  const [entityFilter, setEntityFilter] = useState<string>('All')
  const [actionFilter, setActionFilter] = useState<string>('All')
  
  const [sortConfig, setSortConfig] = useState<{
    key: keyof AuditLog
    direction: 'asc' | 'desc'
  } | null>({ key: 'created_at', direction: 'desc' })
  
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 15

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [pendingAction, setPendingAction] = useState<{ type: 'print' | 'export', format?: 'csv' | 'excel' | 'pdf' } | null>(null)
  
  // JSON Viewer State
  const [jsonViewerData, setJsonViewerData] = useState<AuditLog | null>(null)

  const filteredData = useMemo(() => {
    return logs.filter((log) => {
      const s = search.toLowerCase()
      const matchesSearch =
        (log.actor_email || '').toLowerCase().includes(s) ||
        log.action.toLowerCase().includes(s) ||
        log.entity.toLowerCase().includes(s) ||
        (log.entity_id || '').toLowerCase().includes(s)

      const matchesEntity = entityFilter === 'All' || log.entity === entityFilter
      const matchesAction = actionFilter === 'All' || log.action === actionFilter

      return matchesSearch && matchesEntity && matchesAction
    })
  }, [logs, search, entityFilter, actionFilter])

  const sortedData = useMemo(() => {
    const sortableItems = [...filteredData]
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
  }, [filteredData, sortConfig])

  const requestSort = (key: keyof AuditLog) => {
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
    else setSelectedIds(paginatedData.map(l => l.id))
  }

  const toggleOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const generateExportData = (scope: 'all' | 'selected' = 'all') => {
    const rowsToExport = scope === 'selected' 
      ? sortedData.filter(l => selectedIds.includes(l.id))
      : sortedData

    return rowsToExport.map((log) => ({
      'Timestamp': formatDateTime(log.created_at),
      'Actor Email': log.actor_email || 'System',
      'Actor Role': log.actor_role || 'N/A',
      'Action': log.action,
      'Entity': log.entity,
      'Entity ID': log.entity_id || 'N/A',
      'Before Data': log.before_data ? JSON.stringify(log.before_data) : '',
      'After Data': log.after_data ? JSON.stringify(log.after_data) : '',
    }))
  }

  const dateStr = new Date().toISOString().split('T')[0]

  const executeAction = (scope: 'all' | 'selected') => {
    if (!pendingAction) return

    const exportData = generateExportData(scope)
    const suffix = scope === 'selected' ? '-selected' : ''
    const titleSuffix = scope === 'selected' ? ' (Selected)' : ''
    const sub = `Scope: ${entityFilter} | ${actionFilter}${scope === 'selected' ? ' | Selected Only' : ''}`

    if (pendingAction.type === 'print') {
      exportToPdf(`audit-logs-print-${dateStr}${suffix}`, `System Audit Logs${titleSuffix}`, sub, exportData, 'landscape', true)
    } else if (pendingAction.type === 'export') {
      if (pendingAction.format === 'csv') exportToCsv(`audit-logs-${dateStr}${suffix}`, exportData)
      else if (pendingAction.format === 'excel') exportToExcel(`audit-logs-${dateStr}${suffix}`, exportData, 'Audit Logs')
      else if (pendingAction.format === 'pdf') exportToPdf(`audit-logs-${dateStr}${suffix}`, `System Audit Logs${titleSuffix}`, sub, exportData)
    }

    if (scope === 'selected') toast.success(`Exported ${selectedIds.length} logs`)
    setPendingAction(null)
  }

  const handleGlobalPrint = () => {
    if (selectedIds.length > 0) setPendingAction({ type: 'print' })
    else {
      const sub = `Scope: ${entityFilter} | ${actionFilter}`
      exportToPdf(`audit-logs-print-${dateStr}`, 'System Audit Logs', sub, generateExportData('all'), 'landscape', true)
    }
  }

  const handleGlobalExport = (format: 'csv' | 'excel' | 'pdf') => {
    if (selectedIds.length > 0) setPendingAction({ type: 'export', format })
    else {
      const sub = `Scope: ${entityFilter} | ${actionFilter}`
      if (format === 'csv') exportToCsv(`audit-logs-${dateStr}`, generateExportData('all'))
      if (format === 'excel') exportToExcel(`audit-logs-${dateStr}`, generateExportData('all'), 'Audit Logs')
      if (format === 'pdf') exportToPdf(`audit-logs-${dateStr}`, 'System Audit Logs', sub, generateExportData('all'))
    }
  }

  const uniqueEntities = Array.from(new Set(logs.map(l => l.entity))).sort()
  const uniqueActions = Array.from(new Set(logs.map(l => l.action))).sort()

  return (
    <div className="space-y-md">
      <TableToolbar
        title="Audit Logs"
        subtitle={`${filteredData.length} immutable records`}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by email, entity or ID..."
        
        filter={
          <Select 
            value={entityFilter} 
            onValueChange={(val) => { if (val) setEntityFilter(val); setCurrentPage(1); }}
          >
            <SelectTrigger className="h-9 w-full bg-card text-xs">
              <SelectValue placeholder="All Entities" />
            </SelectTrigger>
            <SelectContent align="start" sideOffset={0}>
              <SelectItem value="All">All Entities</SelectItem>
              {uniqueEntities.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
        }

        sort={
          <Select 
            value={actionFilter} 
            onValueChange={(val) => { if (val) setActionFilter(val); setCurrentPage(1); }}
          >
            <SelectTrigger className="h-9 w-full bg-card text-xs">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent align="start" sideOffset={0}>
              <SelectItem value="All">All Actions</SelectItem>
              {uniqueActions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
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
            onExportCsv={() => { exportToCsv(`audit-logs-selected-${dateStr}`, generateExportData('selected')); toast.success(`Exported ${selectedIds.length} logs`); setSelectedIds([]); }}
            onExportExcel={() => { exportToExcel(`audit-logs-selected-${dateStr}`, generateExportData('selected'), 'Selected Logs'); toast.success(`Exported ${selectedIds.length} logs`); setSelectedIds([]); }}
            onExportPdf={() => { exportToPdf(`audit-logs-selected-${dateStr}`, 'System Audit Logs (Selected)', `Selected: ${selectedIds.length}`, generateExportData('selected')); toast.success(`Exported ${selectedIds.length} logs`); setSelectedIds([]); }}
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
            <TableHead className="cursor-pointer hover:bg-muted text-paragraph-small font-medium text-muted-foreground w-[180px]" onClick={() => requestSort('created_at')}>
              <div className="flex items-center gap-xs">Timestamp <ArrowUpDown className="h-3 w-3" /></div>
            </TableHead>
            <TableHead className="text-paragraph-small font-medium text-muted-foreground">Actor</TableHead>
            <TableHead className="text-paragraph-small font-medium text-muted-foreground">Action</TableHead>
            <TableHead className="text-paragraph-small font-medium text-muted-foreground">Entity</TableHead>
            <TableHead className="text-paragraph-small font-medium text-muted-foreground text-center w-[80px]">Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-12 text-paragraph-small text-muted-foreground">
                No audit logs found matching your filters.
              </TableCell>
            </TableRow>
          ) : (
            paginatedData.map((log) => (
              <TableRow key={log.id} className="hover:bg-muted/50">
                <TableCell className="text-center">
                  <Checkbox 
                    checked={selectedIds.includes(log.id)}
                    onCheckedChange={() => toggleOne(log.id)}
                  />
                </TableCell>
                <TableCell className="text-paragraph-small text-muted-foreground tabular-nums">
                  {formatDateTime(log.created_at)}
                </TableCell>
                <TableCell>
                  <div className="font-medium text-foreground text-paragraph-small">{log.actor_email || 'System'}</div>
                  <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{log.actor_role}</div>
                </TableCell>
                <TableCell>
                  {getActionBadge(log.action)}
                </TableCell>
                <TableCell>
                  <div className="font-medium text-foreground text-paragraph-small">{log.entity}</div>
                  <div className="font-mono text-[10px] text-muted-foreground truncate max-w-[120px]">{log.entity_id}</div>
                </TableCell>
                <TableCell className="text-center">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0" 
                    onClick={() => setJsonViewerData(log)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </TableShell>

      <DataTablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={sortedData.length}
        showingItems={paginatedData.length}
        setCurrentPage={setCurrentPage}
        itemName="logs"
      />

      <ExportConfirmDialog 
        open={!!pendingAction}
        onOpenChange={(open) => !open && setPendingAction(null)}
        actionType={pendingAction?.type || 'export'}
        selectedCount={selectedIds.length}
        totalCount={filteredData.length}
        onConfirm={executeAction}
      />

      {/* JSON Forensic Viewer Dialog */}
            {/* JSON Forensic Viewer Dialog */}
      <Dialog open={!!jsonViewerData} onOpenChange={(open) => !open && setJsonViewerData(null)}>
        {/* Standard Shadcn width, removing flex-col to prevent intrinsic collapse */}
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-heading-2 font-bold flex items-center gap-2">
              <FileJson className="h-5 w-5 text-primary" />
              Forensic Snapshot
            </DialogTitle>
            {/* break-words wraps the text naturally without collapsing the width */}
            <DialogDescription className="break-words text-sm text-muted-foreground mt-1">
              {jsonViewerData?.action} on {jsonViewerData?.entity} ({jsonViewerData?.entity_id})
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            {jsonViewerData?.before_data && (
              <div>
                <h4 className="text-sm font-bold mb-2">Before Data</h4>
                <pre className="bg-muted/50 p-4 rounded-md text-xs font-mono overflow-x-auto whitespace-pre border">
                  {JSON.stringify(jsonViewerData.before_data, null, 2)}
                </pre>
              </div>
            )}
            {jsonViewerData?.after_data && (
              <div>
                <h4 className="text-sm font-bold mb-2 text-emerald-600">After Data</h4>
                <pre className="bg-muted/50 p-4 rounded-md text-xs font-mono overflow-x-auto whitespace-pre border">
                  {JSON.stringify(jsonViewerData.after_data, null, 2)}
                </pre>
              </div>
            )}
            {jsonViewerData?.metadata && (
              <div>
                <h4 className="text-sm font-bold mb-2 text-blue-600">Metadata</h4>
                <pre className="bg-muted/50 p-4 rounded-md text-xs font-mono overflow-x-auto whitespace-pre border">
                  {JSON.stringify(jsonViewerData.metadata, null, 2)}
                </pre>
              </div>
            )}
            {!jsonViewerData?.before_data && !jsonViewerData?.after_data && !jsonViewerData?.metadata && (
              <p className="text-sm text-muted-foreground text-center py-8">No snapshot data recorded for this action.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}