'use client'

import { useState } from 'react'
import { Calendar as CalendarIcon, FileText, BookOpen } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ArrearsTable } from './arrears-table'
import { CashbookTable } from './cashbook-table'
import { ArrearsRow, CashbookRow, getDailyCashbook } from '@/lib/actions/report-actions'

interface ReportsClientProps {
  initialArrears: ArrearsRow[]
  initialCashbook: CashbookRow[]
}

export function ReportsClient({ initialArrears, initialCashbook }: ReportsClientProps) {
  const [activeTab, setActiveTab] = useState<'arrears' | 'cashbook'>('arrears')
  const [date, setDate] = useState<Date>(new Date())
  
  const [cashbookData, setCashbookData] = useState<CashbookRow[]>(initialCashbook)
  const [isLoading, setIsLoading] = useState(false)

  // FIXED: Actually fetch the data from the server
  const handleDateChange = async (newDate: Date | undefined) => {
    if (!newDate) return
    setDate(newDate)
    setIsLoading(true)
    
    try {
      const newData = await getDailyCashbook(newDate)
      setCashbookData(newData)
    } catch (error) {
      console.error('Failed to fetch cashbook:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        
        <div className="inline-flex items-center p-1 bg-muted rounded-lg border border-border">
          <button
            onClick={() => setActiveTab('arrears')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-paragraph-small rounded-md transition-all",
              activeTab === 'arrears' ? "bg-card text-foreground font-bold shadow-sm" : "text-muted-foreground font-medium hover:text-foreground"
            )}
          >
            <FileText className="h-4 w-4" /> Arrears Report
          </button>
          <button
            onClick={() => setActiveTab('cashbook')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-paragraph-small rounded-md transition-all",
              activeTab === 'cashbook' ? "bg-card text-foreground font-bold shadow-sm" : "text-muted-foreground font-medium hover:text-foreground"
            )}
          >
            <BookOpen className="h-4 w-4" /> Daily Cashbook
          </button>
        </div>

        {activeTab === 'cashbook' && (
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[240px] justify-start text-left font-medium h-9",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              }
            />
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={date}
                onSelect={handleDateChange}
              />
            </PopoverContent>
          </Popover>
        )}
      </div>

      <div className="mt-4">
        {activeTab === 'arrears' ? (
          <ArrearsTable data={initialArrears} />
        ) : (
          <div className={cn(isLoading && "opacity-50 pointer-events-none transition-opacity")}>
            <CashbookTable data={cashbookData} selectedDate={date} />
          </div>
        )}
      </div>
    </div>
  )
}