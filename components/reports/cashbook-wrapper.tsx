'use client'

import { useState } from 'react'
import { CashbookRow, getDailyCashbook } from '@/lib/actions/report-actions'
import { CashbookTable } from './cashbook-table'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export function CashbookWrapper({ initialData }: { initialData: CashbookRow[] }) {
  const [date, setDate] = useState<Date>(new Date())
  const [data, setData] = useState<CashbookRow[]>(initialData)
  const [isLoading, setIsLoading] = useState(false)

  const handleDateChange = async (newDate: Date | undefined) => {
    if (!newDate) return
    setDate(newDate)
    setIsLoading(true)
    try {
      const newData = await getDailyCashbook(newDate)
      setData(newData)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-md">
      <div className="flex justify-end">
        <Popover>
          <PopoverTrigger render={
            <Button variant="outline" className={cn("w-[240px] justify-start text-left font-medium h-9")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP") : <span>Pick a date</span>}
            </Button>
          } />
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar mode="single" selected={date} onSelect={handleDateChange} />
          </PopoverContent>
        </Popover>
      </div>
      <div className={cn(isLoading && "opacity-50 pointer-events-none transition-opacity")}>
        <CashbookTable data={data} selectedDate={date} />
      </div>
    </div>
  )
}