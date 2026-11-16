import { Suspense } from 'react'
import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getUnmatchedQueue } from '@/lib/actions/reconciliation-actions'
import { isFinanceAdmin } from '@/lib/auth/roles'
import { UnmatchedTable } from '@/components/reconciliation/unmatched-table'
import { Skeleton } from '@/components/ui/skeleton'

async function UnmatchedContent() {
  await connection()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  if (!dbUser) redirect('/login')

  const allowed =
    isFinanceAdmin(dbUser.role) || dbUser.role === 'NATIONAL_TREASURER'
  if (!allowed) redirect('/dashboard')

  const [items, churches] = await Promise.all([
    getUnmatchedQueue(),
    prisma.church.findMany({
      where: { is_defunct: false },
      select: { id: true, church_code: true, church_name: true },
      orderBy: { church_code: 'asc' },
    }),
  ])

  return <UnmatchedTable items={items} churches={churches} />
}

export default function UnmatchedPage() {
  return (
    <div className="space-y-xl">
      <div>
        <h1 className="text-heading-2 font-bold text-foreground">
          Unmatched Webhook Payments
        </h1>
        <p className="mt-xs text-paragraph-small text-muted-foreground">
          Payments received with an invalid reference, awaiting manual reconciliation.
        </p>
      </div>
      <Suspense fallback={<Skeleton className="h-[600px] rounded-xl" />}>
        <UnmatchedContent />
      </Suspense>
    </div>
  )
}