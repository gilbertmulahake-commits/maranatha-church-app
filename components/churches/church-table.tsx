'use client'

import { useState, useMemo } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils/format'
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

import { deleteChurch } from '@/lib/actions/church-actions'
import { sendBulkReminders } from '@/lib/actions/sms-actions'
import { ViewChurchDialog } from './view-church-dialog'
import { EditChurchDialog } from './edit-church-dialog'

/**
 * Row shape mirrors `getChurches()` from Phase B.
 * Updated for STRICT BUCKET ISOLATION: annual and monthly credits are separate.
 */
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
  
  // Strictly separated credits
  annualCredit: number
  monthlyCredit: number

  annualPaid: number
  monthlyPaid: number
  annualOutstanding: number
  monthlyOutstanding: number

  status: 'Paid' | 'Partial' | 'Overdue'
  annualStatus: 'Paid' | 'Partial' | 'Overdue' | 'N/A'
  monthlyStatus: 'Paid' | 'Partial' | 'Overdue'
}

export function ChurchTable({
  data,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  regionFilter,
  setRegionFilter,
  periodView,
  setPeriodView,
}: {
  data: ChurchRow[]
  search: string
  setSearch: (val: string) => void
  statusFilter: string
  setStatusFilter: (val: string) => void
  regionFilter: string
  setRegionFilter: (val: string) => void
  periodView: 'month' | 'year'
  setPeriodView: (val: 'month' | 'year') => void
}) {
  const [sortConfig, setSortConfig] = useState<{
    key: keyof ChurchRow | 'region.name'
    direction: 'asc' | 'desc'
  } | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 15

  const [viewingChurch, setViewingChurch] = useState<ChurchRow | null>(null)
  const [editingChurch, setEditingChurch] = useState<ChurchRow | null>(null)
  const [selectedChurches, setSelectedChurches] = useState<string[]>([])
  const [isBulkSending, setIsBulkSending] = useState(false)

  const uniqueRegions = useMemo(() => {
    const regions = data.map((c) => c.region?.name).filter(Boolean) as string[]
    return ['All', ...Array.from(new Set(regions)).sort()]
  }, [data])

  const sortedData = useMemo(() => {
    let sortableItems = [...data]
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue =
          sortConfig.key === 'region.name'
            ? a.region?.name || ''
            : a[sortConfig.key as keyof ChurchRow]
        let bValue =
          sortConfig.key === 'region.name'
            ? b.region?.name || ''
            : b[sortConfig.key as keyof ChurchRow]
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

  const totalPages = Math.ceil(sortedData.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const paginatedData = sortedData.slice(startIndex, startIndex + rowsPerPage)

  const toggleAll = () => {
    if (selectedChurches.length === paginatedData.length && paginatedData.length > 0) {
      setSelectedChurches([])
    } else {
      setSelectedChurches(paginatedData.map((c) => c.id))
    }
  }

  const toggleOne = (id: string) => {
    setSelectedChurches((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const handleBulkReminder = async () => {
    if (selectedChurches.length === 0) return
    setIsBulkSending(true)

    const selectedData = data.filter((c) => selectedChurches.includes(c.id))
    const recipients = selectedData
      .filter((c) => c.pastor_phone)
      .map((c) => ({
        phone: c.pastor_phone,
        name: c.pastor_name,
        type: 'Pastor' as const,
        annualOutstanding: c.annualOutstanding,
        monthlyOutstanding: c.monthlyOutstanding,
      }))

    if (recipients.length === 0) {
      toast.error('No pastor phone numbers available for selected churches')
      setIsBulkSending(false)
      return
    }

    const res = await sendBulkReminders(recipients, 'NATIONAL')

    setIsBulkSending(false)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success(`Sent ${res.successCount} reminders successfully`)
      setSelectedChurches([])
    }
  }

  const isMonthly = periodView === 'month'
  const paidLabel = isMonthly ? 'Monthly Paid' : 'Annual Paid'
  const outLabel = isMonthly ? 'Monthly Out' : 'Annual Out'

  return (
    <div className="space-y-md">
      <TableToolbar
        title="Churches"
        subtitle={`National Registry · ${data.length} total`}
        search={search}
        setSearch={setSearch}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        statusOptions={['All', 'Paid', 'Partial', 'Overdue']}
        filterSlot={
          <div className="flex items-center gap-xs w-full lg:w-auto">
            <span className="text-paragraph-small text-muted-foreground whitespace-nowrap">
              Region:
            </span>
            <select
              value={regionFilter}
              onChange={(e) => {
                setRegionFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="h-9 w-full lg:w-[150px] rounded-md border border-border bg-card px-3 py-1 text-paragraph-small text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {uniqueRegions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        }
        selectionCount={selectedChurches.length}
        onClearSelection={() => setSelectedChurches([])}
        onBulkAction={handleBulkReminder}
        isBulkLoading={isBulkSending}
        periodView={periodView}
        setPeriodView={setPeriodView}
      />

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={
                    selectedChurches.length === paginatedData.length &&
                    paginatedData.length > 0
                  }
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted text-paragraph-small"
                onClick={() => requestSort('church_name')}
              >
                <div className="flex items-center gap-xs">
                  Church <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted text-paragraph-small"
                onClick={() => requestSort('region.name')}
              >
                <div className="flex items-center gap-xs">
                  Region <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              <TableHead className="text-paragraph-small">Pastor</TableHead>
              <TableHead className="text-paragraph-small">Treasurer</TableHead>

              <TableHead
                className="cursor-pointer hover:bg-muted text-paragraph-small"
                onClick={() => requestSort(isMonthly ? 'monthlyPaid' : 'annualPaid')}
              >
                <div className="flex items-center gap-xs">
                  {paidLabel} <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>

              <TableHead
                className="cursor-pointer hover:bg-muted text-paragraph-small"
                onClick={() =>
                  requestSort(isMonthly ? 'monthlyOutstanding' : 'annualOutstanding')
                }
              >
                <div className="flex items-center gap-xs">
                  {outLabel} <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>

              <TableHead className="text-paragraph-small">Status</TableHead>
              <TableHead className="text-right text-paragraph-small">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center py-8 text-paragraph-small text-muted-foreground"
                >
                  No churches found matching your filters.
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((church) => {
                const activeStatus = isMonthly ? church.monthlyStatus : church.annualStatus

                return (
                  <TableRow key={church.id} className="hover:bg-muted/50">
                    <TableCell>
                      <Checkbox
                        checked={selectedChurches.includes(church.id)}
                        onCheckedChange={() => toggleOne(church.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground text-paragraph-small">
                        {church.church_name}
                      </div>
                      <div className="font-mono text-paragraph-mini text-muted-foreground">
                        {church.church_code}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-paragraph-small">
                      {church.region?.name ?? 'Unassigned'}
                    </TableCell>
                    <TableCell>
                      <div className="text-foreground text-paragraph-small">
                        {church.pastor_name || 'N/A'}
                      </div>
                      <div className="text-paragraph-mini tabular-nums text-muted-foreground">
                        {church.pastor_phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-foreground text-paragraph-small">
                        {church.treasurer_name}
                      </div>
                      <div className="text-paragraph-mini tabular-nums text-muted-foreground">
                        {church.contact_phone}
                      </div>
                    </TableCell>

                    <TableCell className="font-medium text-emerald-600 text-paragraph-small tabular-nums">
                      {formatCurrency(isMonthly ? church.monthlyPaid : church.annualPaid)}
                    </TableCell>

                    {/* STRICT BUCKET ISOLATION: Swap credit and outstanding based on view */}
                    <TableCell className="tabular-nums font-medium text-paragraph-small">
                      {isMonthly ? (
                        church.monthlyCredit > 0 ? (
                          <span className="text-emerald-600">
                            Credit: {formatCurrency(church.monthlyCredit)}
                          </span>
                        ) : (
                          <span className="text-destructive">
                            {formatCurrency(church.monthlyOutstanding)}
                          </span>
                        )
                      ) : (
                        church.annualCredit > 0 ? (
                          <span className="text-emerald-600">
                            Credit: {formatCurrency(church.annualCredit)}
                          </span>
                        ) : (
                          <span className="text-destructive">
                            {formatCurrency(church.annualOutstanding)}
                          </span>
                        )
                      )}
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          activeStatus === 'Paid'
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                            : activeStatus === 'Partial'
                            ? 'bg-amber-100 text-amber-700 border-amber-200'
                            : activeStatus === 'Overdue'
                            ? 'bg-red-100 text-red-700 border-red-200'
                            : 'bg-gray-100 text-gray-700 border-gray-200' // N/A
                        }
                      >
                        {activeStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          }
                        ></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuGroup>
                            <DropdownMenuLabel className="text-paragraph-small">
                              Actions
                            </DropdownMenuLabel>
                          </DropdownMenuGroup>

                          <DropdownMenuItem
                            className="cursor-pointer text-paragraph-small"
                            onClick={() => setViewingChurch(church)}
                          >
                            <Eye className="mr-2 h-4 w-4" /> View Details
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            className="cursor-pointer text-paragraph-small"
                            onClick={() => setEditingChurch(church)}
                          >
                            <Edit className="mr-2 h-4 w-4" /> Edit Church
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            className="text-destructive cursor-pointer text-paragraph-small"
                            onClick={async () => {
                              if (
                                confirm(
                                  `Are you sure you want to delete ${church.church_name}?`
                                )
                              ) {
                                const res = await deleteChurch(church.id)
                                if (res?.error) {
                                  toast.error('Failed to delete church', {
                                    description: res.error,
                                  })
                                } else {
                                  toast.success('Church deleted successfully')
                                }
                              }
                            }}
                          >
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
          Showing {paginatedData.length} of {sortedData.length} churches
        </p>
        <div className="flex items-center gap-xs">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="h-8 text-paragraph-small"
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ViewChurchDialog church={viewingChurch} onClose={() => setViewingChurch(null)} />
      <EditChurchDialog church={editingChurch} onClose={() => setEditingChurch(null)} />
    </div>
  )
}