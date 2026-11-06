'use client'

import { useState, useEffect } from 'react'
import { Loader2, CalendarDays, Download } from 'lucide-react'
import { getDailyCashbook, CashbookRow } from '@/lib/actions/report-actions'
import { exportToCsv } from '@/lib/utils/export'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatTime(dateString: string) {
  return new Intl.DateTimeFormat('en-KE', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(new Date(dateString))
}

export function CashbookTable() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [data, setData] = useState<CashbookRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    
    async function fetchData() {
      setLoading(true)
      const targetDate = new Date(selectedDate)
      targetDate.setMinutes(targetDate.getMinutes() + targetDate.getTimezoneOffset())
      
      const result = await getDailyCashbook(targetDate)
      if (isMounted) {
        setData(result)
        setLoading(false)
      }
    }

    fetchData()
    return () => { isMounted = false }
  }, [selectedDate])

  const totalCollected = data.reduce((sum, row) => sum + row.amount_paid, 0)

  const handleExport = () => {
    const exportData = data.map((row) => ({
      'Time': formatTime(row.payment_date),
      'Transaction ID': row.transaction_id,
      'Church Code': row.church_code,
      'Church Name': row.church_name,
      'Type': row.payment_type,
      'Method': row.payment_method === 'M_Pesa' ? 'M-Pesa' : row.payment_method === 'Bank_Transfer' ? 'Bank' : 'Cash',
      'Amount (KES)': row.amount_paid,
    }))
    exportToCsv(`cashbook-${selectedDate}`, exportData)
  }

  return (
    <div className="space-y-md">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-heading-4 font-medium text-foreground">Transaction Log</h3>
          <p className="text-paragraph-small text-muted-foreground">Reconcile the physical KCB statement against this view.</p>
        </div>
        
        <div className="flex items-center gap-sm">
          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-card p-1 rounded-md border border-border h-9">
            <CalendarDays className="h-4 w-4 text-muted-foreground ml-2" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-8 rounded-md bg-transparent px-2 text-paragraph-small text-foreground focus:outline-none"
            />
          </div>

          <Button 
            variant="outline" 
            onClick={handleExport} 
            disabled={data.length === 0 || loading}
            className="h-9"
          >
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="text-paragraph-small">Time</TableHead>
              <TableHead className="text-paragraph-small">Transaction ID</TableHead>
              <TableHead className="text-paragraph-small">Church</TableHead>
              <TableHead className="text-paragraph-small text-center">Type</TableHead>
              <TableHead className="text-paragraph-small text-center">Method</TableHead>
              <TableHead className="text-right text-paragraph-small">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-paragraph-small text-muted-foreground">
                  No transactions recorded for this date.
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/50">
                  <TableCell className="text-paragraph-small text-muted-foreground">
                    {formatTime(row.payment_date)}
                  </TableCell>
                  <TableCell className="font-mono text-paragraph-small text-muted-foreground">
                    {row.transaction_id}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground text-paragraph-small">{row.church_name}</div>
                    <div className="font-mono text-paragraph-mini text-muted-foreground">{row.church_code}</div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={row.payment_type === 'Annual' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}>
                      {row.payment_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center text-paragraph-small text-muted-foreground">
                    {row.payment_method === 'M_Pesa' ? 'M-Pesa' : row.payment_method === 'Bank_Transfer' ? 'Bank' : 'Cash'}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums text-emerald-600 text-paragraph-small">
                    {formatCurrency(row.amount_paid)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          <TableFooter className="bg-muted/50 border-t-2 border-border">
            <TableRow>
              <TableCell colSpan={5} className="font-bold text-paragraph-small text-right">Total Collected</TableCell>
              <TableCell className="text-right font-bold tabular-nums text-paragraph-small text-emerald-600 text-base">
                {formatCurrency(totalCollected)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  )
}