import { Suspense } from 'react'
import { connection } from 'next/server'
import { verifyReportsAccess } from '@/lib/auth/guards'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ReportSelector } from '@/components/reports/report-selector'

async function HubContent() {
  await connection()
  await verifyReportsAccess()

  const reports = [
    { href: '/dashboard/reports/arrears', title: 'Arrears Report', desc: 'Gross, Written Off, and Net Recoverable balances.' },
    { href: '/dashboard/reports/cashbook', title: 'Daily Cashbook', desc: 'Transaction ledger for a specific date.' },
    { href: '/dashboard/reports/write-offs', title: 'Write-Off Register', desc: 'Approved bad-debt write-offs.' },
    { href: '/dashboard/reports/defunct', title: 'Defunct Churches', desc: 'Churches that have been fully written off.' },
    { href: '/dashboard/reports/inactive', title: 'Inactive Churches', desc: 'No paid payment in the last 6 months.' },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
      {reports.map((r) => (
        <Link key={r.href} href={r.href}>
          <Card className="hover:shadow-md transition-shadow h-full">
            <CardHeader>
              <CardTitle className="text-heading-4">{r.title}</CardTitle>
              <CardDescription className="text-paragraph-small">{r.desc}</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      ))}
    </div>
  )
}

export default function ReportsHubPage() {
  return (
    <div className="space-y-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-heading-2 font-bold text-foreground">Reports & Analytics</h1>
          <p className="mt-xs text-paragraph-small text-muted-foreground">
            Select a report to view, print, or export.
          </p>
        </div>
        <ReportSelector />
      </div>
      <Suspense fallback={<div className="text-muted-foreground">Loading reports...</div>}>
        <HubContent />
      </Suspense>
    </div>
  )
}