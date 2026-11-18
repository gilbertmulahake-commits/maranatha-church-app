import { Suspense } from 'react'
import { connection } from 'next/server'
import { verifyReportsAccess } from '@/lib/auth/guards'
import { notFound } from 'next/navigation'
import { 
  getArrearsReport, getDailyCashbook, getWriteOffRegister, 
  getDefunctChurchRegister, getInactiveChurches 
} from '@/lib/actions/report-actions'
import { ReportShell } from '@/components/reports/report-shell'
import { ArrearsTable } from '@/components/reports/arrears-table'
import { CashbookWrapper } from '@/components/reports/cashbook-wrapper'
import { WriteOffRegisterTable } from '@/components/reports/write-off-register-table'
import { DefunctRegisterTable } from '@/components/reports/defunct-register-table'
import { InactiveChurchesTable } from '@/components/reports/inactive-churches-table'
import { Skeleton } from '@/components/ui/skeleton'

const REPORT_META: Record<string, { title: string, description: string }> = {
  'arrears': { title: 'Arrears Report', description: 'Gross, Written Off, and Net Recoverable balances per church.' },
  'cashbook': { title: 'Daily Cashbook', description: 'Transaction ledger for a specific date.' },
  'write-offs': { title: 'Write-Off Register', description: 'Approved bad-debt write-offs.' },
  'defunct': { title: 'Defunct Churches', description: 'Churches that have been fully written off.' },
  'inactive': { title: 'Inactive Churches', description: 'No paid payment in the last 6 months.' },
}

async function ReportContent({ report }: { report: string }) {
  await connection()
  await verifyReportsAccess()
  
  const meta = REPORT_META[report]
  if (!meta) notFound()

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
  }

  return (
    <ReportShell title={meta.title} description={meta.description} current={report}>
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