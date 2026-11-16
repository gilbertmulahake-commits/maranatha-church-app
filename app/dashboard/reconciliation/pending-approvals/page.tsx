import { Suspense } from 'react'
import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getPendingApprovals } from '@/lib/actions/manual-entry-actions'
import { PendingApprovalsTable } from '@/components/reconciliation/pending-approvals-table'
import { Skeleton } from '@/components/ui/skeleton'

async function PendingApprovalsContent() {
  await connection()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  if (!dbUser) redirect('/login')

  // Only Treasurer and System Admin can view this queue
  if (dbUser.role !== 'NATIONAL_TREASURER' && dbUser.role !== 'SYSTEM_ADMIN') {
    redirect('/dashboard')
  }

  const items = await getPendingApprovals()
  return <PendingApprovalsTable items={items} />
}

export default function PendingApprovalsPage() {
  return (
    <div className="space-y-xl">
      <div>
        <h1 className="text-heading-2 font-bold text-foreground">Pending Approvals</h1>
        <p className="mt-xs text-paragraph-small text-muted-foreground">
          Review and approve high-value payments and write-offs.
        </p>
      </div>
      <Suspense fallback={<Skeleton className="h-[600px] rounded-xl" />}>
        <PendingApprovalsContent />
      </Suspense>
    </div>
  )
}