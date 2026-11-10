import { Suspense } from 'react'
import { connection } from 'next/server'
import { getCurrentUserProfile } from '@/lib/actions/user-actions'
import { ProfileCard } from '@/components/settings/profile-card'
import { PasswordForm } from '@/components/settings/password-form'
import { redirect } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeleton'

async function SettingsContent() {
  await connection()
  const profile = await getCurrentUserProfile()

  if (!profile) redirect('/login')

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-md items-start w-full">
      <ProfileCard profile={profile} />
      <PasswordForm />
    </div>
  )
}

export default function SettingsPage() {
  return (
    // INLINE STYLE SOLUTION RESTORED
    <div className="space-y-xl" style={{ width: '100%', maxWidth: '64rem' }}>
      <div>
        <h1 className="text-heading-2 font-bold text-foreground">Settings</h1>
        <p className="mt-xs text-paragraph-small text-muted-foreground">
          Manage your personal profile and system security.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md items-start w-full">
            <Skeleton className="h-[400px] rounded-xl" />
            <Skeleton className="h-[400px] rounded-xl" />
          </div>
        }
      >
        <SettingsContent />
      </Suspense>
    </div>
  )
}