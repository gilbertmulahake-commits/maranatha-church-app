'use client'

import { useState, useMemo } from 'react'
import {
  ArrowUpDown,
  MoreHorizontal,
  Eye,
  Edit,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { TableToolbar } from '@/components/ui/table-toolbar'
import { DataTablePagination } from '@/components/ui/data-table-pagination' // <-- IMPORTED
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
import { RegionalChurchData } from '@/lib/actions/regional-actions'
import { sendBulkReminders } from '@/lib/actions/sms-actions'
import { SendReminderButton } from '@/components/dashboard/send-reminder-button'

import { ViewChurchDialog } from '@/components/churches/view-church-dialog'
import { EditChurchDialog } from '@/components/churches/edit-church-dialog'
import type { ChurchRow } from '@/components/churches/church-table'

interface Props {
  churches: RegionalChurchData[]
  search: string
  setSearch: (val: string) => void
  statusFilter: string
  setStatusFilter: (val: string) => void
  currentPage: number
  setCurrentPage: (val: number) => void
  userRole?: 'NATIONAL' | 'REGIONAL'
  periodView: 'month' | 'year'
  setPeriodView: (val: 'month' | 'year') => void
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function RegionalTable({
  churches,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  currentPage,
  setCurrentPage,
  userRole = 'REGIONAL',
  periodView,
  setPeriodView,
}: Props) {
  const [sortConfig, setSortConfig] = useState<{
    key: keyof RegionalChurchData
    direction: 'asc' | 'desc'
  } | null>(null)
  const rowsPerPage = 15

  const [viewingChurch, setViewingChurch] = useState<ChurchRow | null>(null)
  const [editingChurch, setEditingChurch] = useState<ChurchRow | null>(null)
  const [selectedChurches, setSelectedChurches] = useState<string[]>([])
  const [isBulkSending, setIsBulkSending] = useState(false)

  const mapToChurchRow = (church: RegionalChurchData): ChurchRow => ({
    id: church.id,
    church_code: church.church_code,
    church_name: church.church_name,
    region: null,
    pastor_name: church.pastor_name,
    pastor_phone: church.pastor_phone,
    treasurer_name: church.treasurer_name,
    contact_phone: church.contact_phone,
    amountPaid: church.amountPaid,
    expected: church.amountPaid + church.outstanding,
    outstanding: church.outstanding,
    annualCredit: church.annualCredit,
    monthlyCredit: church.monthlyCredit,
    annualPaid: church.annualPaid,
    monthlyPaid: church.monthlyPaid,
    annualOutstanding: church.annualOutstanding,
    monthlyOutstanding: church.monthlyOutstanding,
    status: church.status,
    annualStatus: church.annualStatus,
    monthlyStatus: church.monthlyStatus,
  })

  const sortedChurches = useMemo(() => {
    let sortableItems = [...churches]
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
  }, [churches, sortConfig])

  const requestSort = (key: keyof RegionalChurchData) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const totalPages = Math.ceil(sortedChurches.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const paginatedData = sortedChurches.slice(startIndex, startIndex + rowsPerPage)

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

    const selectedData = churches.filter((c) => selectedChurches.includes(c.id))
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

    const res = await sendBulkReminders(recipients, userRole)

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
        title="Churches in Region"
        subtitle={`${churches.length} churches · ${
          userRole === 'REGIONAL' ? 'Chairman View' : 'National View'
        }`}
        search={search}
        setSearch={setSearch}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        statusOptions={['All', 'Paid', 'Partial', 'Overdue']}
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
                  colSpan={8}
                  className="text-center py-8 text-paragraph-small text-muted-foreground"
                >
                  No churches found matching your filters.
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((church) => {
                const activeStatus = isMonthly
                  ? church.monthlyStatus
                  : church.annualStatus

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

                    <TableCell className="tabular-nums font-medium text-emerald-600 text-paragraph-small">
                      {formatCurrency(
                        isMonthly ? church.monthlyPaid : church.annualPaid
                      )}
                    </TableCell>
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
                            : 'bg-gray-100 text-gray-700 border-gray-200'
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
                            onClick={() => setViewingChurch(mapToChurchRow(church))}
                          >
                            <Eye className="mr-2 h-4 w-4" /> View Details
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            className="cursor-pointer text-paragraph-small"
                            onClick={() => setEditingChurch(mapToChurchRow(church))}
                          >
                            <Edit className="mr-2 h-4 w-4" /> Edit Church
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          {(activeStatus === 'Partial' || activeStatus === 'Overdue') && (
                            <SendReminderButton
                              churchId={church.church_code}
                              churchName={church.church_name}
                              pastorName={church.pastor_name}
                              phone={church.pastor_phone}
                              senderRole={userRole}
                              annualOutstanding={church.annualOutstanding}
                              monthlyOutstanding={church.monthlyOutstanding}
                            />
                          )}
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

      {/* STANDARD PAGINATION FOOTER */}
      <DataTablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={sortedChurches.length}
        showingItems={paginatedData.length}
        setCurrentPage={setCurrentPage}
        itemName="churches"
      />

      <ViewChurchDialog church={viewingChurch} onClose={() => setViewingChurch(null)} />
      <EditChurchDialog church={editingChurch} onClose={() => setEditingChurch(null)} />
    </div>
  )
}