import { Suspense } from 'react'
import { connection } from 'next/server'
import { getArrearsReport, getDailyCashbook } from '@/lib/actions/report-actions'
import { ReportsClient } from '@/components/reports/reports-client'
import { Skeleton } from '@/components/ui/skeleton'

async function ReportsContent() {
  await connection()

  // Fetch both datasets concurrently
  const [arrearsData, cashbookData] = await Promise.all([
    getArrearsReport(),
    getDailyCashbook(new Date())
  ])

  return (
    <ReportsClient 
      initialArrears={arrearsData} 
      initialCashbook={cashbookData} 
    />
  )
}

export default function ReportsPage() {
  return (
    <div className="space-y-xl">
      <div>
        <h1 className="text-heading-2 font-bold text-foreground">Reports & Analytics</h1>
        <p className="mt-xs text-paragraph-small text-muted-foreground">
          Generate structured views of arrears and daily collections.
        </p>
      </div>

      <Suspense fallback={
        <div className="space-y-xl">
          <div className="flex gap-4">
            <Skeleton className="h-10 w-[250px] rounded-lg" />
            <Skeleton className="h-10 w-[150px] rounded-lg" />
          </div>
          <Skeleton className="h-[500px] w-full rounded-xl" />
        </div>
      }>
        <ReportsContent />
      </Suspense>
    </div>
  )
}