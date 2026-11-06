import { Suspense } from 'react'
import { connection } from 'next/server'
import { AppShell } from '@/components/layout/app-shell'
import { getArrearsReport } from '@/lib/actions/report-actions'
import { ReportsClient } from '@/components/reports/reports-client'

async function ReportsContent() {
  // Fetch initial Arrears data on the server for fast initial load
  const arrearsData = await getArrearsReport()

  return (
    <div className="space-y-xl">
      <div>
        <h1 className="text-heading-2 font-medium text-foreground">Reports & Analytics</h1>
        <p className="mt-xs text-paragraph-small text-muted-foreground">
          Generate structured views of arrears and daily collections.
        </p>
      </div>

      <ReportsClient initialArrears={arrearsData} />
    </div>
  )
}

async function Content() {
  await connection()
  return (
    <AppShell>
      <Suspense fallback={<div className="p-xl text-muted-foreground">Loading reports...</div>}>
        <ReportsContent />
      </Suspense>
    </AppShell>
  )
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="p-xl text-muted-foreground">Loading...</div>}>
      <Content />
    </Suspense>
  )
}