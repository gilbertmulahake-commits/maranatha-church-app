'use client'

import { useState, useMemo } from 'react'
import { 
  ChevronLeft, 
  ChevronRight, 
  MapPin, 
  ArrowUpDown, 
  MoreHorizontal,
  Edit,
  Trash2,
  Eye
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { TableToolbar } from '@/components/ui/table-toolbar'
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
import { sendBulkReminders } from '@/lib/actions/sms-actions'
import { SendChairmanButton } from './send-chairman-button'
import { EditRegionDialog } from './edit-region-dialog'
import { useRouter } from 'next/navigation'

const slugify = (text: string) => text.toLowerCase().replace(/\s+/g, '-')

export type RegionRow = {
  id: string
  name: string
  chairman_name: string
  contact_phone: string
  churchCount: number
  compliancePct: number
  totalCollected: number
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount)
}

export function RegionTable({ data }: { data: RegionRow[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [sortConfig, setSortConfig] = useState<{ key: keyof RegionRow, direction: 'asc' | 'desc' } | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 10
  
  const [editingRegion, setEditingRegion] = useState<RegionRow | null>(null)
  const [selectedRegions, setSelectedRegions] = useState<string[]>([])
  const [isBulkSending, setIsBulkSending] = useState(false)

  const getStatus = (pct: number) => {
    if (pct >= 90) return { label: 'Excellent', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
    if (pct >= 75) return { label: 'Good', color: 'bg-blue-100 text-blue-700 border-blue-200' }
    return { label: 'Needs Attention', color: 'bg-red-100 text-red-700 border-red-200' }
  }

  const filteredData = useMemo(() => {
    return data.filter((region) => {
      const s = search.toLowerCase()
      const matchesSearch = 
        region.name.toLowerCase().includes(s) ||
        region.chairman_name.toLowerCase().includes(s)
      
      const matchesStatus = statusFilter === 'All' || getStatus(region.compliancePct).label === statusFilter
      
      return matchesSearch && matchesStatus
    })
  }, [data, search, statusFilter])

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

  const totalPages = Math.ceil(sortedData.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const paginatedData = sortedData.slice(startIndex, startIndex + rowsPerPage)

  const toggleAll = () => {
    if (selectedRegions.length === paginatedData.length && paginatedData.length > 0) {
      setSelectedRegions([])
    } else {
      setSelectedRegions(paginatedData.map(r => r.id))
    }
  }

  const toggleOne = (id: string) => {
    setSelectedRegions(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const handleBulkReminder = async () => {
    if (selectedRegions.length === 0) return
    setIsBulkSending(true)

    const selectedData = data.filter(r => selectedRegions.includes(r.id))
    const recipients = selectedData
      .filter(r => r.contact_phone)
      .map(r => ({ phone: r.contact_phone, name: r.chairman_name, type: 'Chairman' as const }))

    if (recipients.length === 0) {
      toast.error('No chairman phone numbers available for selected regions')
      setIsBulkSending(false)
      return
    }

    const res = await sendBulkReminders(recipients)
    
    setIsBulkSending(false)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success(`Sent ${res.successCount} reminders successfully`)
      setSelectedRegions([])
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
        statusOptions={['All', 'Excellent', 'Good', 'Needs Attention']}
        selectionCount={selectedRegions.length}
        onClearSelection={() => setSelectedRegions([])}
        onBulkAction={handleBulkReminder}
        isBulkLoading={isBulkSending}
        bulkActionLabel="Remind Chairmen"
      />

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox 
                  checked={selectedRegions.length === paginatedData.length && paginatedData.length > 0}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted text-paragraph-small" onClick={() => requestSort('name')}>
                <div className="flex items-center gap-xs">Region <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="text-paragraph-small">Chairman</TableHead>
              <TableHead className="cursor-pointer hover:bg-muted text-paragraph-small" onClick={() => requestSort('churchCount')}>
                <div className="flex items-center gap-xs">Churches <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted text-paragraph-small" onClick={() => requestSort('totalCollected')}>
                <div className="flex items-center gap-xs">Collected <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted text-paragraph-small" onClick={() => requestSort('compliancePct')}>
                <div className="flex items-center gap-xs">Compliance <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="text-paragraph-small">Status</TableHead>
              <TableHead className="text-right text-paragraph-small">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-paragraph-small text-muted-foreground">
                  No regions found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((region) => {
                const status = getStatus(region.compliancePct)
                return (
                  <TableRow key={region.id} className="hover:bg-muted/50">
                    <TableCell>
                      <Checkbox 
                        checked={selectedRegions.includes(region.id)}
                        onCheckedChange={() => toggleOne(region.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground flex items-center gap-xs text-paragraph-small">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {region.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-foreground text-paragraph-small">{region.chairman_name}</div>
                      <div className="text-paragraph-mini tabular-nums text-muted-foreground">{region.contact_phone}</div>
                    </TableCell>
                    <TableCell className="tabular-nums text-foreground text-paragraph-small">
                      {region.churchCount}
                    </TableCell>
                    <TableCell className="tabular-nums font-medium text-emerald-600 text-paragraph-small">
                      {formatCurrency(region.totalCollected || 0)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-md">
                        <span className="text-paragraph-small font-medium text-foreground w-12">{region.compliancePct.toFixed(1)}%</span>
                        <div className="h-1.5 w-24 rounded-full bg-muted">
                          <div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.min(region.compliancePct, 100)}%` }} />
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
                          {/* WRAPPED IN GROUP FOR BASE UI */}
                          <DropdownMenuGroup>
                            <DropdownMenuLabel className="text-paragraph-small">Actions</DropdownMenuLabel>
                          </DropdownMenuGroup>
                          
                          <DropdownMenuItem 
                            className="cursor-pointer text-paragraph-small" 
                            onClick={() => router.push(`/dashboard/regions/${slugify(region.name)}`)}
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

                          <DropdownMenuItem 
                            className="cursor-pointer text-paragraph-small" 
                            onClick={() => setEditingRegion(region)}
                          >
                            <Edit className="mr-2 h-4 w-4" /> Edit Region
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />
                          
                          <DropdownMenuItem className="text-destructive cursor-pointer text-paragraph-small">
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

      <div className="flex items-center justify-between">
        <p className="text-paragraph-small text-muted-foreground">
          Showing {paginatedData.length} of {sortedData.length} regions
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

      <EditRegionDialog 
        region={editingRegion} 
        onClose={() => setEditingRegion(null)} 
      />
    </div>
  )
}