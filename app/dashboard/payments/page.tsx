import { Suspense } from 'react'
import { connection } from 'next/server'
import { AppShell } from '@/components/layout/app-shell'
import { getPayments } from '@/lib/actions/payment-actions'
import { PaymentsKpiCards } from '@/components/payments/payments-kpi-cards'
import { PaymentsTable } from '@/components/payments/payments-table'

async function PaymentsContent() {
  const { payments, stats } = await getPayments()

  return (
    <div className="space-y-xl">
      <div>
        <h1 className="text-heading-2 font-medium text-foreground">Payments Ledger</h1>
        <p className="mt-xs text-paragraph-small text-muted-foreground">
          Audit and reconcile all incoming transactions.
        </p>
      </div>

      {/* KPI Cards */}
      <PaymentsKpiCards stats={stats} />

      {/* Data Table */}
      <PaymentsTable data={payments} />
    </div>
  )
}

async function Content() {
  // Force dynamic rendering (auth-protected via AppShell)
  await connection()

  return (
    <AppShell>
      <Suspense fallback={<div className="p-xl text-muted-foreground">Loading payments ledger...</div>}>
        <PaymentsContent />
      </Suspense>
    </AppShell>
  )
}

export default function PaymentsPage() {
  return (
    <Suspense fallback={<div className="p-xl text-muted-foreground">Loading...</div>}>
      <Content />
    </Suspense>
  )
}