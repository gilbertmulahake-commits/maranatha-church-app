'use client'

import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface TableToolbarProps {
  title: string
  subtitle: string
  search: string
  setSearch: (val: string) => void
  statusFilter?: string
  setStatusFilter?: (val: string) => void
  statusOptions?: string[]
  filterSlot?: React.ReactNode
  
  // Bulk Selection
  selectionCount?: number
  onClearSelection?: () => void
  bulkActionSlot?: React.ReactNode // <-- REPLACED rigid action with a flexible slot
  
  // Period Toggle
  periodView?: 'month' | 'year'
  setPeriodView?: (val: 'month' | 'year') => void
}

export function TableToolbar({
  title, subtitle, search, setSearch,
  statusFilter, setStatusFilter, statusOptions, filterSlot,
  selectionCount = 0, onClearSelection, bulkActionSlot,
  periodView, setPeriodView
}: TableToolbarProps) {
  return (
    <div className="space-y-md">
      <div className="flex items-start justify-between gap-md">
        <div>
          <h2 className="text-heading-4 font-bold text-foreground tracking-tight">{title}</h2>
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
          {/* Period Toggle */}
          {periodView && setPeriodView && (
            <div className="flex items-center gap-xs bg-muted rounded-md p-1">
              <Button
                variant="ghost" size="sm"
                className={cn(
                  "h-7 px-sm text-paragraph-mini transition-all",
                  periodView === 'month' ? 'bg-card text-foreground font-bold shadow-sm' : 'text-muted-foreground font-medium'
                )}
                onClick={() => setPeriodView('month')}
              >
                Monthly
              </Button>
              <Button
                variant="ghost" size="sm"
                className={cn(
                  "h-7 px-sm text-paragraph-mini transition-all",
                  periodView === 'year' ? 'bg-card text-foreground font-bold shadow-sm' : 'text-muted-foreground font-medium'
                )}
                onClick={() => setPeriodView('year')}
              >
                Yearly
              </Button>
            </div>
          )}

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

      {selectionCount > 0 && onClearSelection && (
        <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg p-md">
          <div className="flex items-center gap-sm">
            <span className="text-paragraph-small font-bold text-foreground">
              {selectionCount} selected
            </span>
            <Button variant="ghost" size="sm" onClick={onClearSelection} className="h-7 text-paragraph-mini">
              Clear
            </Button>
          </div>
          <div className="flex items-center gap-xs">
            {/* RENDERS THE PASSED-IN DROPDOWN OR BUTTON */}
            {bulkActionSlot}
          </div>
        </div>
      )}
    </div>
  )
}