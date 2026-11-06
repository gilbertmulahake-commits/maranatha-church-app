import { AppShell } from '@/components/layout/app-shell'
import { Settings } from 'lucide-react'

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">System Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your profile and system configuration.
          </p>
        </div>
        
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-12 text-center h-[400px]">
          <Settings className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium text-foreground">Settings & Profile</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            This section will allow users to update their passwords, phone numbers, and system preferences in a future unit.
          </p>
        </div>
      </div>
    </AppShell>
  )
}