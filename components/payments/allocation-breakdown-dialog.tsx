'use client'

import { useState, useMemo } from 'react'
import { Eye, ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ExportDropdown } from '@/components/ui/export-dropdown'
import { exportToCsv, exportToExcel, exportToPdf } from '@/lib/utils/export-advanced'

interface Allocation {
  allocation_type: string
  billing_year: number
  billing_month: number | null
  amount: number
}

interface Props {
  transactionId: string
  totalAmount: number
  allocations: Allocation[]
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(amount)
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function AllocationBreakdownDialog({ transactionId, totalAmount, allocations }: Props) {
  const [open, setOpen] = useState(false)
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState<{
    key: 'type' | 'period' | 'amount'
    direction: 'asc' | 'desc'
  }>({ key: 'period', direction: 'asc' })

  // Quick Summary calculations
  const summary = useMemo(() => {
    let annual = 0
    let monthly = 0
    allocations.forEach(a => {
      if (a.allocation_type === 'Annual') annual += a.amount
      else monthly += a.amount
    })
    return { annual, monthly }
  }, [allocations])

  // Sorting logic
  const sortedAllocations = useMemo(() => {
    return [...allocations].sort((a, b) => {
      let comparison = 0
      
      if (sortConfig.key === 'type') {
        comparison = a.allocation_type.localeCompare(b.allocation_type)
      } else if (sortConfig.key === 'period') {
        const aPeriod = a.billing_year * 100 + (a.billing_month || 0)
        const bPeriod = b.billing_year * 100 + (b.billing_month || 0)
        comparison = aPeriod - bPeriod
      } else if (sortConfig.key === 'amount') {
        comparison = a.amount - b.amount
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison
    })
  }, [allocations, sortConfig])

  const requestSort = (key: 'type' | 'period' | 'amount') => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  // Enrich data for exports
  const generateExportData = () => {
    return sortedAllocations.map(a => ({
      'Type': a.allocation_type,
      'Billing Period': a.allocation_type === 'Annual' ? `Year ${a.billing_year}` : `${MONTH_NAMES[(a.billing_month || 1) - 1]} ${a.billing_year}`,
      'Amount (KES)': a.amount
    }))
  }

  const handleExportCsv = () => exportToCsv(`allocation-breakdown-${transactionId}`, generateExportData())
  const handleExportExcel = () => exportToExcel(`allocation-breakdown-${transactionId}`, generateExportData(), 'Allocations')
  const handleExportPdf = () => exportToPdf(
    `allocation-breakdown-${transactionId}`, 
    'Payment Allocation Breakdown', 
    `Transaction: ${transactionId} | Total: ${formatCurrency(totalAmount)} | Annual: ${formatCurrency(summary.annual)} | Monthly: ${formatCurrency(summary.monthly)}`, 
    generateExportData(),
    'portrait'
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
            <Eye className="h-4 w-4" />
          </Button>
        }
      />
      
      <DialogContent className="w-[95vw] sm:max-w-[600px] flex flex-col max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Payment Breakdown</DialogTitle>
            <ExportDropdown 
              onExportCsv={handleExportCsv}
              onExportExcel={handleExportExcel}
              onExportPdf={handleExportPdf}
              disabled={allocations.length === 0}
            />
          </div>
          <DialogDescription>
            Transaction <span className="font-mono text-foreground font-medium">{transactionId}</span> 
            &middot; Total: <span className="font-medium text-emerald-600">{formatCurrency(totalAmount)}</span>
          </DialogDescription>

          {/* Quick Summary Pills */}
          <div className="flex items-center gap-2 pt-2">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              Annual: {formatCurrency(summary.annual)}
            </Badge>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
              Monthly: {formatCurrency(summary.monthly)}
            </Badge>
          </div>
        </DialogHeader>

        <div className="rounded-md border border-border mt-4 flex-1 overflow-hidden flex flex-col w-full">
          <div className="overflow-y-auto w-full">
            <Table className="w-full">
              <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow>
                  <TableHead 
                    className="w-[120px] whitespace-nowrap cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => requestSort('type')}
                  >
                    <div className="flex items-center gap-1">
                      Type <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="whitespace-nowrap cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => requestSort('period')}
                  >
                    <div className="flex items-center gap-1">
                      Billing Period <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-right whitespace-nowrap cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => requestSort('amount')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Amount <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAllocations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                      No allocations recorded for this payment.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedAllocations.map((alloc, i) => (
                    <TableRow key={i} className="hover:bg-muted/50">
                      <TableCell>
                        <Badge variant="outline" className={alloc.allocation_type === 'Annual' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}>
                          {alloc.allocation_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-paragraph-small text-foreground whitespace-nowrap">
                        {alloc.allocation_type === 'Annual' 
                          ? `Year ${alloc.billing_year}`
                          : `${MONTH_NAMES[(alloc.billing_month || 1) - 1]} ${alloc.billing_year}`
                        }
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums text-foreground text-paragraph-small whitespace-nowrap">
                        {formatCurrency(alloc.amount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}