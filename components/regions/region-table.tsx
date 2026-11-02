'use client'

import { useState, useMemo } from 'react'
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  MapPin, 
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
import { SendChairmanButton } from './send-chairman-button'
import { useRouter } from 'next/navigation'
import { EditRegionDialog } from './edit-region-dialog'

export type RegionRow = {
  id: string
  name: string
  chairman_name: string
  contact_phone: string
  churchCount: number
  compliancePct: number
}

export function RegionTable({ data }: { data: RegionRow[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [sortConfig, setSortConfig] = useState<{ key: keyof RegionRow, direction: 'asc' | 'desc' } | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 10
  
  // State to manage the Edit Dialog
  const [editingRegion, setEditingRegion] = useState<RegionRow | null>(null)

  // 1. Filter
  const filteredData = useMemo(() => {
    return data.filter((region) => {
      const s = search.toLowerCase()
      return (
        region.name.toLowerCase().includes(s) ||
        region.chairman_name.toLowerCase().includes(s)
      )
    })
  }, [data, search])

  // 2. Sort
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

  const requestSort = (key: keyof RegionRow) => {
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

  // Helper for status badge
  const getStatus = (pct: number) => {
    if (pct >= 90) return { label: 'Excellent', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
    if (pct >= 75) return { label: 'Good', color: 'bg-blue-100 text-blue-700 border-blue-200' }
    return { label: 'Needs Attention', color: 'bg-red-100 text-red-700 border-red-200' }
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search regions or chairmen..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
          className="pl-10 bg-card border-border"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="cursor-pointer hover:bg-muted" onClick={() => requestSort('name')}>
                <div className="flex items-center gap-1">Region <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead>Chairman</TableHead>
              <TableHead className="cursor-pointer hover:bg-muted" onClick={() => requestSort('churchCount')}>
                <div className="flex items-center gap-1">Churches <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted" onClick={() => requestSort('compliancePct')}>
                <div className="flex items-center gap-1">Compliance <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No regions found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((region) => {
                const status = getStatus(region.compliancePct)
                return (
                  <TableRow key={region.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="font-medium text-foreground flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {region.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-foreground">{region.chairman_name}</div>
                      <div className="text-xs tabular-nums text-muted-foreground">{region.contact_phone}</div>
                    </TableCell>
                    <TableCell className="tabular-nums text-foreground">
                      {region.churchCount}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-foreground w-12">{region.compliancePct.toFixed(1)}%</span>
                        <div className="h-1.5 w-24 rounded-full bg-muted">
                          <div 
                            className="h-1.5 rounded-full bg-primary" 
                            style={{ width: `${Math.min(region.compliancePct, 100)}%` }} 
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={status.color}>
                        {status.label}
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
                          <DropdownMenuItem 
                            className="cursor-pointer" 
                            onClick={() => router.push(`/dashboard/churches?region=${encodeURIComponent(region.name)}`)}
                          >
                            <Eye className="mr-2 h-4 w-4" /> View Churches
                          </DropdownMenuItem>
                          
                          <SendChairmanButton 
                            regionName={region.name}
                            chairmanName={region.chairman_name}
                            phone={region.contact_phone}
                            compliancePct={region.compliancePct}
                            arrears={0}
                          />

                          {/* Changed to a standard menu item that triggers state */}
                          <DropdownMenuItem 
                            className="cursor-pointer" 
                            onClick={() => setEditingRegion(region)}
                          >
                            <Edit className="mr-2 h-4 w-4" /> Edit Region
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive cursor-pointer">
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

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {paginatedData.length} of {sortedData.length} regions
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

      {/* Render the dialog at the root level, controlled by state */}
      <EditRegionDialog 
        region={editingRegion} 
        onClose={() => setEditingRegion(null)} 
      />
    </div>
  )
}