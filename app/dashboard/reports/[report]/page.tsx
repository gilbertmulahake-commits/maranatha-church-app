import { Suspense } from 'react'
import { connection } from 'next/server'
import { verifyReportsAccess } from '@/lib/auth/guards'
import { notFound } from 'next/navigation'
import { 
  getArrearsReport, getDailyCashbook, getWriteOffRegister, 
  getDefunctChurchRegister, getInactiveChurches,
  getCollectionsSummary, getRegionOptions,
  getComplianceReport, getRegionalScoresReport,
  getYoYComparison, getAllocationBreakdown, getSourceMethodBreakdown
} from '@/lib/actions/report-actions'
import { ReportShell } from '@/components/reports/report-shell'
import { ArrearsTable } from '@/components/reports/arrears-table'
import { CashbookWrapper } from '@/components/reports/cashbook-wrapper'
import { WriteOffRegisterTable } from '@/components/reports/write-off-register-table'
import { DefunctRegisterTable } from '@/components/reports/defunct-register-table'
import { InactiveChurchesTable } from '@/components/reports/inactive-churches-table'
import { CollectionsSummaryTable } from '@/components/reports/analytics/collections-summary-table'
import { ComplianceTable } from '@/components/reports/analytics/compliance-table'
import { RegionalScoresTable } from '@/components/reports/analytics/regional-scores-table'
import { YoYComparisonView } from '@/components/reports/analytics/yoy-comparison-view'
import { AllocationBreakdownTable } from '@/components/reports/analytics/allocation-breakdown-table'
import { SourceMethodView } from '@/components/reports/analytics/source-method-view'
import { Skeleton } from '@/components/ui/skeleton'
import { getReportBySlug, getReportsForRole } from '@/lib/utils/report-registry'

async function ReportContent({ report }: { report: string }) {
  await connection()
  const { actorRole } = await verifyReportsAccess()

  const meta = getReportBySlug(report)
  if (!meta) notFound()

  const visible = getReportsForRole(actorRole)
  if (!visible.some((r) => r.slug === report)) notFound()

  let table = null

  if (report === 'arrears') {
    const data = await getArrearsReport()
    table = <ArrearsTable data={data} />
  } else if (report === 'cashbook') {
    const data = await getDailyCashbook(new Date())
    table = <CashbookWrapper initialData={data} />
  } else if (report === 'write-offs') {
    const data = await getWriteOffRegister()
    table = <WriteOffRegisterTable data={data} />
  } else if (report === 'defunct') {
    const data = await getDefunctChurchRegister()
    table = <DefunctRegisterTable data={data} />
  } else if (report === 'inactive') {
    const data = await getInactiveChurches()
    table = <InactiveChurchesTable data={data} />
  } else if (report === 'collections-summary') {
    const [data, regions] = await Promise.all([
      getCollectionsSummary('month'),
      getRegionOptions(),
    ])
    table = <CollectionsSummaryTable initialData={data} regions={regions} />
  } else if (report === 'compliance') {
    const data = await getComplianceReport()
    table = <ComplianceTable data={data} />
  } else if (report === 'regional-scores') {
    const data = await getRegionalScoresReport()
    table = <RegionalScoresTable data={data} />
  } else if (report === 'yoy-comparison') {
    const [data, regions] = await Promise.all([
      getYoYComparison(),
      getRegionOptions(),
    ])
    table = <YoYComparisonView initialData={data} regions={regions} />
  } else if (report === 'allocation-breakdown') {
    const now = new Date()
    const start = new Date(now.getFullYear(), 0, 1)
    const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59)
    const initialResult = await getAllocationBreakdown(start, end)
    table = <AllocationBreakdownTable initialResult={initialResult} />
  } else if (report === 'source-method') {
    const [initialResult, regions] = await Promise.all([
      getSourceMethodBreakdown(),
      getRegionOptions(),
    ])
    table = <SourceMethodView initialResult={initialResult} regions={regions} />
  }

  return (
    <ReportShell title={meta.title} description={meta.description} current={report} role={actorRole}>
      {table}
    </ReportShell>
  )
}

export default async function ReportPage(props: { params: Promise<{ report: string }> }) {
  const params = await props.params
  const report = params.report

  return (
    <div className="space-y-xl">
      <Suspense fallback={
        <div className="space-y-xl">
          <div className="flex justify-between items-center">
            <Skeleton className="h-10 w-[300px]" />
            <Skeleton className="h-10 w-[240px]" />
          </div>
          <Skeleton className="h-[500px] w-full rounded-xl" />
        </div>
      }>
        <ReportContent report={report} />
      </Suspense>
    </div>
  )
}