import { Suspense } from 'react'
import { connection } from 'next/server'
import { AppShell } from '@/components/layout/app-shell'
import { Settings } from 'lucide-react'

async function Content() {
  await connection()

  return (
    <AppShell>
      <div className="space-y-xl">
        <div>
          <h1 className="text-heading-2 font-medium text-foreground">System Settings</h1>
          <p className="mt-xs text-paragraph-small text-muted-foreground">
            Manage your profile and system configuration.
          </p>
        </div>
        
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-xl text-center h-[400px]">
          <Settings className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-heading-4 font-medium text-foreground">Settings & Profile</h3>
          <p className="mt-1 text-paragraph-small text-muted-foreground">
            This section will allow users to update passwords, phone numbers, and system preferences in a future unit.
          </p>
        </div>
      </div>
    </AppShell>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-xl text-muted-foreground">Loading...</div>}>
      <Content />
    </Suspense>
  )
}