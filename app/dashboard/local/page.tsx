import { AppShell } from '@/components/layout/app-shell'
import { Church } from 'lucide-react'

export default function LocalChurchDashboard() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Local Church Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View your church's financial status and compliance.
          </p>
        </div>
        
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-12 text-center h-[400px]">
          <Church className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium text-foreground">Church Dashboard</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            This dedicated view for Pastors and Treasurers will be built in a future unit.
          </p>
        </div>
      </div>
    </AppShell>
  )
}