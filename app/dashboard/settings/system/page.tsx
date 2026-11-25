import { Suspense } from 'react'
import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import { getCurrentUserRole } from '@/lib/actions/auth-actions'
import { isNationalLevel } from '@/lib/auth/roles'
import { SystemConfigContent } from '@/components/settings/system-config-content'
import { SystemConfigSkeleton } from '@/components/settings/system-config-skeleton'

export const instant = false

export default function SystemPage() {
  return (
    <Suspense fallback={<SystemConfigSkeleton />}>
      <SystemSettings />
    </Suspense>
  )
}

async function SystemSettings() {
  await connection()
  const role = await getCurrentUserRole()

  if (!isNationalLevel(role)) {
    redirect('/dashboard/settings/profile')
  }

  const bankAdapterMode = (process.env.BANK_ADAPTER_MODE ?? '').trim() || null
  const buildSha = (
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.GIT_COMMIT_SHA ??
    ''
  ).slice(0, 7)

  return (
    <SystemConfigContent
      role={role}
      bankAdapterMode={bankAdapterMode}
      buildSha={buildSha}
    />
  )
}