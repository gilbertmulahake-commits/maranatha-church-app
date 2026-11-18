import { Suspense } from 'react'
import { connection } from 'next/server'
import { verifyReportsAccess } from '@/lib/auth/guards'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ReportSelector } from '@/components/reports/report-selector'
import { getReportsForRole } from '@/lib/utils/report-registry'

async function HubContent() {
  await connection()
  const { actorRole } = await verifyReportsAccess()

  const reports = getReportsForRole(actorRole)

  return (
    <div className="space-y-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-heading-2 font-bold text-foreground">Reports &amp; Analytics</h1>
          <p className="mt-xs text-paragraph-small text-muted-foreground">
            Select a report to view, print, or export.
          </p>
        </div>
        <ReportSelector role={actorRole} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
        {reports.map((r) => (
          <Link key={r.slug} href={`/dashboard/reports/${r.slug}`}>
            <Card className="hover:shadow-md transition-shadow h-full">
              <CardHeader>
                <CardTitle className="text-heading-4">{r.title}</CardTitle>
                <CardDescription className="text-paragraph-small">
                  {r.description}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default function ReportsHubPage() {
  return (
    <Suspense fallback={<div className="text-muted-foreground">Loading reports...</div>}>
      <HubContent />
    </Suspense>
  )
}