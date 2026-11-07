import { Suspense } from 'react'
import { connection } from 'next/server'
import { getPayments } from '@/lib/actions/payment-actions'
import { PaymentsKpiCards } from '@/components/payments/payments-kpi-cards'
import { PaymentsTable } from '@/components/payments/payments-table'
import { Skeleton } from '@/components/ui/skeleton'

async function PaymentsContent() {
  await connection()
  const { payments, stats } = await getPayments()

  return (
    <>
      <PaymentsKpiCards stats={stats} />
      <PaymentsTable data={payments} />
    </>
  )
}

export default function PaymentsPage() {
  return (
    <div className="space-y-xl">
      <div>
        <h1 className="text-heading-2 font-medium text-foreground">Payments Ledger</h1>
        <p className="mt-xs text-paragraph-small text-muted-foreground">
          Audit and reconcile all incoming transactions.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="space-y-xl">
            <div className="grid grid-cols-1 gap-md md:grid-cols-2 lg:grid-cols-4">
              <Skeleton className="h-[140px] rounded-xl" />
              <Skeleton className="h-[140px] rounded-xl" />
              <Skeleton className="h-[140px] rounded-xl" />
              <Skeleton className="h-[140px] rounded-xl" />
            </div>
            <Skeleton className="h-[600px] rounded-xl" />
          </div>
        }
      >
        <PaymentsContent />
      </Suspense>
    </div>
  )
}