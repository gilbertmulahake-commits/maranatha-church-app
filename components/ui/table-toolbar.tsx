'use client'

import { Search, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface TableToolbarProps {
  title: string
  subtitle: string
  search: string
  setSearch: (val: string) => void
  statusFilter?: string
  setStatusFilter?: (val: string) => void
  statusOptions?: string[]
  filterSlot?: React.ReactNode
  selectionCount?: number
  onClearSelection?: () => void
  onBulkAction?: () => Promise<void> // NEW
  isBulkLoading?: boolean           // NEW
  bulkActionLabel?: string          // NEW
}

export function TableToolbar({
  title,
  subtitle,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  statusOptions,
  filterSlot,
  selectionCount = 0,
  onClearSelection,
  onBulkAction,
  isBulkLoading = false,
  bulkActionLabel = 'Send Reminders',
}: TableToolbarProps) {
  return (
    <div className="space-y-md">
      <div className="flex items-start justify-between gap-md">
        <div>
          <h2 className="text-heading-4 font-semibold text-foreground">{title}</h2>
          <p className="text-paragraph-small text-muted-foreground mt-xs">{subtitle}</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-md justify-between items-center">
        <div className="relative w-full" style={{ maxWidth: '24rem' }}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={`Search ${title.toLowerCase()}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card border-border h-9 text-paragraph-small"
          />
        </div>

        <div className="flex items-center gap-sm w-full lg:w-auto">
          {filterSlot && <div className="flex items-center gap-xs">{filterSlot}</div>}

          {statusFilter !== undefined && setStatusFilter && statusOptions && (
            <div className="flex items-center gap-xs w-full lg:w-auto">
              <span className="text-paragraph-small text-muted-foreground whitespace-nowrap">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 w-full lg:w-[130px] rounded-md border border-border bg-card px-3 py-1 text-paragraph-small text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {statusOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectionCount > 0 && onClearSelection && (
        <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg p-md">
          <div className="flex items-center gap-sm">
            <span className="text-paragraph-small font-medium text-foreground">
              {selectionCount} selected
            </span>
            <Button variant="ghost" size="sm" onClick={onClearSelection} className="h-7 text-paragraph-mini">
              Clear
            </Button>
          </div>
          <div className="flex items-center gap-xs">
            {onBulkAction && (
              <Button 
                onClick={onBulkAction} 
                disabled={isBulkLoading}
                className="h-8 text-paragraph-small bg-primary text-primary-foreground"
              >
                {isBulkLoading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                {isBulkLoading ? 'Sending...' : bulkActionLabel}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}