'use client'

import React from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

export interface TableToolbarProps {
  title: string
  subtitle?: string
  search: string
  
  // New API (used by ChurchTable)
  onSearchChange?: (val: string) => void
  searchPlaceholder?: string
  toggle?: React.ReactNode
  filter?: React.ReactNode
  sort?: React.ReactNode
  actions?: React.ReactNode

  // Old API (used by RegionTable, PaymentsTable, etc.)
  setSearch?: (val: string) => void
  statusFilter?: string
  setStatusFilter?: (val: string) => void
  statusOptions?: string[]
  filterSlot?: React.ReactNode
  periodView?: 'month' | 'year'
  setPeriodView?: (val: 'month' | 'year') => void

  // Shared
  selectionCount?: number
  onClearSelection?: () => void
  bulkActionSlot?: React.ReactNode
}

export function TableToolbar(props: TableToolbarProps) {
  const {
    title, subtitle, search,
    onSearchChange, setSearch, searchPlaceholder,
    toggle, filter, sort, actions,
    selectionCount = 0, onClearSelection, bulkActionSlot,
    statusFilter, setStatusFilter, statusOptions, filterSlot, periodView, setPeriodView
  } = props

  // Safely handle both search APIs
  const handleSearchChange = onSearchChange || setSearch || (() => {})

  // Map legacy props to new slots if the new slots aren't provided
  const toggleSlot = toggle || (periodView && setPeriodView ? (
    <div className="flex items-center gap-1 bg-muted rounded-md p-1 h-9 w-full @[450px]:w-auto">
      <Button
        variant="ghost" size="sm"
        className={cn(
          "h-7 flex-1 @[450px]:flex-none px-3 text-xs transition-all",
          periodView === 'month' ? 'bg-card text-foreground font-bold shadow-sm' : 'text-muted-foreground font-medium'
        )}
        onClick={() => setPeriodView('month')}
      >
        Monthly
      </Button>
      <Button
        variant="ghost" size="sm"
        className={cn(
          "h-7 flex-1 @[450px]:flex-none px-3 text-xs transition-all",
          periodView === 'year' ? 'bg-card text-foreground font-bold shadow-sm' : 'text-muted-foreground font-medium'
        )}
        onClick={() => setPeriodView('year')}
      >
        Yearly
      </Button>
    </div>
  ) : null)

  // ONLY CHANGE: Upgraded the legacy fallback from native <select> to shadcn <Select>
  const sortSlot = sort || (statusFilter !== undefined && setStatusFilter && statusOptions ? (
    <Select
      value={statusFilter}
      onValueChange={(val) => { if (val) setStatusFilter(val) }}
    >
      <SelectTrigger className="h-9 w-full bg-card text-xs">
        <SelectValue placeholder="Status" />
      </SelectTrigger>
      <SelectContent>
        {statusOptions.map((opt) => (
          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  ) : null)

  const filterSlotRendered = filter || (filterSlot ? (
    <div className="flex flex-wrap items-center gap-2 w-full @[600px]:w-auto">
      {filterSlot}
    </div>
  ) : null)

  return (
    <div className="@container w-full space-y-4">
      {/* HEADER */}
      <div className="flex flex-col gap-1">
        <h2 className="text-heading-4 font-bold text-foreground tracking-tight">{title}</h2>
        {subtitle && <p className="text-paragraph-small text-muted-foreground">{subtitle}</p>}
      </div>

      {/* MASTER RESPONSIVE GRID (Kept your preferred layout) */}
      <div className="grid grid-cols-1 gap-3 
                      @[600px]:grid-cols-2 
                      @[900px]:grid-cols-[minmax(300px,1fr)_auto_auto] @[900px]:items-center">
        
        {/* 1. LEFT: Search & Toggle */}
        <div className="flex flex-col @[450px]:flex-row @[450px]:items-center gap-2 w-full">
          <div className="relative w-full @[450px]:max-w-[400px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder || `Search...`}
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 pr-9 bg-card border-border h-9 text-paragraph-small w-full"
            />
            {search && (
              <button 
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {toggleSlot && <div className="shrink-0 w-full @[450px]:w-auto">{toggleSlot}</div>}
        </div>

        {/* 2. CENTER: Filter & Sort (Kept your preferred layout) */}
        <div className="flex w-full gap-2 @[600px]:col-start-1 @[900px]:col-start-2 @[900px]:justify-end @[900px]:w-auto">
          {filterSlotRendered && <div className="flex-1 @[600px]:flex-none">{filterSlotRendered}</div>}
          {sortSlot && <div className="flex-1 @[600px]:flex-none">{sortSlot}</div>}
        </div>

        {/* 3. RIGHT: Actions */}
        {actions && (
          <div className="flex items-center gap-2 w-full @[600px]:col-start-2 @[600px]:row-start-1 @[600px]:justify-end @[900px]:col-start-3 @[900px]:row-start-1">
            {actions}
          </div>
        )}
      </div>

      {/* BULK ACTION BAR */}
      {selectionCount > 0 && onClearSelection && (
        <div className="flex flex-col @[450px]:flex-row items-start @[450px]:items-center justify-between bg-primary/5 border border-primary/20 rounded-lg p-3 gap-3 transition-all animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-foreground">{selectionCount} selected</span>
            <Button variant="ghost" size="sm" onClick={onClearSelection} className="h-7 text-xs">Clear</Button>
          </div>
          <div className="flex items-center gap-2 w-full @[450px]:w-auto justify-end">
            {bulkActionSlot}
          </div>
        </div>
      )}
    </div>
  )
}