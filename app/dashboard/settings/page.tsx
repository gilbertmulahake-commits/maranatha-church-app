import { Suspense } from 'react'
import { connection } from 'next/server'
import { AppShell } from '@/components/layout/app-shell'
import { getCurrentUserProfile } from '@/lib/actions/user-actions'
import { ProfileCard } from '@/components/settings/profile-card'
import { PasswordForm } from '@/components/settings/password-form'
import { redirect } from 'next/navigation'

async function SettingsContent() {
  const profile = await getCurrentUserProfile()

  if (!profile) {
    redirect('/login')
  }

  return (
    // INLINE STYLE SOLUTION to bypass flex collapse
    <div className="space-y-xl" style={{ width: '100%', maxWidth: '64rem' }}>
      <div>
        <h1 className="text-heading-2 font-medium text-foreground">Settings</h1>
        <p className="mt-xs text-paragraph-small text-muted-foreground">
          Manage your personal profile and system security.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-md items-start">
        <ProfileCard profile={profile} />
        <PasswordForm />
      </div>
    </div>
  )
}

async function Content() {
  // Force dynamic rendering (auth-protected via AppShell)
  await connection()

  return (
    <AppShell>
      <Suspense fallback={<div className="p-xl text-muted-foreground">Loading settings...</div>}>
        <SettingsContent />
      </Suspense>
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