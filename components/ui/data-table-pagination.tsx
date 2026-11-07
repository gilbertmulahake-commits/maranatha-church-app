'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DataTablePaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  showingItems: number
  setCurrentPage: (page: number) => void
  itemName?: string // e.g., "churches", "transactions", "users"
}

export function DataTablePagination({
  currentPage,
  totalPages,
  totalItems,
  showingItems,
  setCurrentPage,
  itemName = 'items',
}: DataTablePaginationProps) {
  return (
    <div className="flex items-center justify-between border-t border-border px-2 py-4">
      <p className="text-paragraph-small text-muted-foreground">
        Showing {showingItems} of {totalItems} {itemName}
      </p>
      <div className="flex items-center gap-xs">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="h-8 text-paragraph-small"
        >
          <ChevronLeft className="h-4 w-4" /> Previous
        </Button>
        <span className="text-paragraph-small text-muted-foreground">
          Page {currentPage} of {totalPages || 1}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages || totalPages === 0}
          className="h-8 text-paragraph-small"
        >
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}