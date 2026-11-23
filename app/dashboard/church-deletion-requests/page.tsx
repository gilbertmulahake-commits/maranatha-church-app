import { Suspense } from 'react'
import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import { verifyOperationsAccess } from '@/lib/auth/guards'
import { getChurchDeletionRequests } from '@/lib/actions/church-deletion-request-actions'
import { ChurchDeletionRequestsTable } from '@/components/churches/church-deletion-requests-table'
import { Skeleton } from '@/components/ui/skeleton'

export const instant = false

async function Content() {
  await connection()

  try {
    await verifyOperationsAccess()
  } catch {
    redirect('/dashboard')
  }

  const items = await getChurchDeletionRequests()

  return (
    <div className="space-y-xl">
      <div>
        <h1 className="text-heading-2 font-bold text-foreground">
          Church Deletion Requests
        </h1>
        <p className="mt-xs text-paragraph-small text-muted-foreground">
          Review deletion requests submitted by Regional Chairmen and Treasurers.
          Approving soft-deletes the church and deactivates its users; rejecting
          preserves the church and notifies the proposer.
        </p>
      </div>

      <ChurchDeletionRequestsTable items={items} />
    </div>
  )
}

export default function ChurchDeletionRequestsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-xl">
          <Skeleton className="h-[60px] w-[320px]" />
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
      }
    >
      <Content />
    </Suspense>
  )
}