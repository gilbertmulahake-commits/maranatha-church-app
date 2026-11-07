import { Suspense } from 'react'
import { connection } from 'next/server'
import { getArrearsReport } from '@/lib/actions/report-actions'
import { ReportsClient } from '@/components/reports/reports-client'
import { Skeleton } from '@/components/ui/skeleton'

async function ReportsContent() {
  await connection()
  const arrearsData = await getArrearsReport()

  return <ReportsClient initialArrears={arrearsData} />
}

export default function ReportsPage() {
  return (
    <div className="space-y-xl">
      <div>
        <h1 className="text-heading-2 font-medium text-foreground">Reports & Analytics</h1>
        <p className="mt-xs text-paragraph-small text-muted-foreground">
          Generate structured views of arrears and daily collections.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="space-y-xl">
            <Skeleton className="h-10 w-[300px] rounded-lg" />
            <Skeleton className="h-[600px] rounded-xl" />
          </div>
        }
      >
        <ReportsContent />
      </Suspense>
    </div>
  )
}