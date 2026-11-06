import { AppShell } from '@/components/layout/app-shell'
import { CreditCard } from 'lucide-react'

export default function PaymentsPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payments Ledger</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Audit and reconcile all incoming transactions.
          </p>
        </div>
        
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-12 text-center h-[400px]">
          <CreditCard className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium text-foreground">Payments Ledger</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            The full transaction table will be built in Unit 10.
          </p>
        </div>
      </div>
    </AppShell>
  )
}