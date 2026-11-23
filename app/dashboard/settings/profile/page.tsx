import { Suspense } from 'react'
import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import { getCurrentUserProfile } from '@/lib/actions/user-actions'
import { ProfileCard } from '@/components/settings/profile-card'
import { PasswordForm } from '@/components/settings/password-form'
import { PersonalInfoForm } from '@/components/settings/personal-info-form'
import { Skeleton } from '@/components/ui/skeleton'

async function ProfileContent() {
  await connection()
  const profile = await getCurrentUserProfile()
  if (!profile) redirect('/login')

  return (
    <div className="space-y-xl">
      <PersonalInfoForm profile={profile} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-md items-start">
        <ProfileCard profile={profile} />
        <PasswordForm />
      </div>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-xl">
          <Skeleton className="h-96 rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md items-start">
            <Skeleton className="h-96 rounded-xl" />
            <Skeleton className="h-96 rounded-xl" />
          </div>
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  )
}