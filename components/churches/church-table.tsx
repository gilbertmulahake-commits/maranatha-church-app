'use client'

import { useState, useMemo } from 'react'
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpDown, 
  MoreHorizontal,
  Edit,
  Trash2,
  Eye
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export type ChurchRow = {
  id: string
  church_code: string
  church_name: string
  region: { name: string } | null
  pastor_name: string
  pastor_phone: string
  treasurer_name: string
  contact_phone: string
  amountPaid: number
  expected: number
  outstanding: number
  status: 'Paid' | 'Partial' | 'Overdue'
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount)
}

// 1. Update the signature to receive state as props
export function ChurchTable({ 
  data,
  search, setSearch,
  statusFilter, setStatusFilter,
  regionFilter, setRegionFilter
}: { 
  data: ChurchRow[]
  search: string
  setSearch: (val: string) => void
  statusFilter: string
  setStatusFilter: (val: string) => void
  regionFilter: string
  setRegionFilter: (val: string) => void
}) {
  const [sortConfig, setSortConfig] = useState<{ key: keyof ChurchRow | 'region.name', direction: 'asc' | 'desc' } | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 15

  // Extract unique region names for the dropdown
  const uniqueRegions = useMemo(() => {
    const regions = data.map(c => c.region?.name).filter(Boolean) as string[]
    return ['All', ...Array.from(new Set(regions)).sort()]
  }, [data])

  // 2. Sort (filtering is now done in ChurchDashboard)
  const sortedData = useMemo(() => {
    let sortableItems = [...data]
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue = sortConfig.key === 'region.name' ? (a.region?.name || '') : a[sortConfig.key as keyof ChurchRow]
        let bValue = sortConfig.key === 'region.name' ? (b.region?.name || '') : b[sortConfig.key as keyof ChurchRow]

        if (aValue === null) aValue = ''
        if (bValue === null) bValue = ''

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }
    return sortableItems
  }, [data, sortConfig])

  const requestSort = (key: keyof ChurchRow | 'region.name') => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  // 3. Paginate
  const totalPages = Math.ceil(sortedData.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const paginatedData = sortedData.slice(startIndex, startIndex + rowsPerPage)

  return (
    <div className="space-y-4">
      {/* Top Bar: Search and Filter */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search churches..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="pl-10 bg-card border-border"
          />
        </div>
        
        <div className="flex items-center gap-4 w-full lg:w-auto">
          {/* Region Filter */}
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Region:</span>
            <select
              value={regionFilter}
              onChange={(e) => { setRegionFilter(e.target.value); setCurrentPage(1); }}
              className="h-9 w-full lg:w-[150px] rounded-md border border-border bg-card px-3 py-1 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {uniqueRegions.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="h-9 w-full lg:w-[120px] rounded-md border border-border bg-card px-3 py-1 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="All">All</option>
              <option value="Paid">Paid</option>
              <option value="Partial">Partial</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="cursor-pointer hover:bg-muted" onClick={() => requestSort('church_name')}>
                <div className="flex items-center gap-1">Church <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted" onClick={() => requestSort('region.name')}>
                <div className="flex items-center gap-1">Region <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead>Pastor</TableHead>
              <TableHead>Treasurer</TableHead>
              <TableHead className="cursor-pointer hover:bg-muted" onClick={() => requestSort('outstanding')}>
                <div className="flex items-center gap-1">Outstanding <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No churches found matching your filters.
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((church) => (
                <TableRow key={church.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="font-medium text-foreground">{church.church_name}</div>
                    <div className="font-mono text-xs text-muted-foreground">{church.church_code}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{church.region?.name ?? 'Unassigned'}</TableCell>
                  <TableCell>
                    <div className="text-foreground">{church.pastor_name || 'N/A'}</div>
                    <div className="text-xs tabular-nums text-muted-foreground">{church.pastor_phone}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-foreground">{church.treasurer_name}</div>
                    <div className="text-xs tabular-nums text-muted-foreground">{church.contact_phone}</div>
                  </TableCell>
                  <TableCell className="font-medium text-destructive">
                    {formatCurrency(church.outstanding)}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={
                        church.status === 'Paid' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                        church.status === 'Partial' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                        'bg-red-100 text-red-700 border-red-200'
                      }
                    >
                      {church.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      }>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuGroup>
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        </DropdownMenuGroup>
                        <DropdownMenuItem className="cursor-pointer">
                          <Eye className="mr-2 h-4 w-4" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer">
                          <Edit className="mr-2 h-4 w-4" /> Edit Church
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive cursor-pointer">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {paginatedData.length} of {sortedData.length} churches
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages || 1}</span>
          <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}