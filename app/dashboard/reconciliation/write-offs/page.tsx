import { Suspense } from 'react'
import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getWriteOffs } from '@/lib/actions/writeoff-actions'
import { isFinanceAdmin } from '@/lib/auth/roles'
import { WriteOffTable } from '@/components/reconciliation/writeoff-table'
import { Skeleton } from '@/components/ui/skeleton'

async function WriteOffsContent() {
  await connection()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  if (!dbUser) redirect('/login')

  if (!isFinanceAdmin(dbUser.role) && dbUser.role !== 'NATIONAL_TREASURER') {
    redirect('/dashboard')
  }

  const [writeOffs, churches] = await Promise.all([
    getWriteOffs(),
    prisma.church.findMany({
      where: { is_defunct: false },
      select: { id: true, church_code: true, church_name: true },
      orderBy: { church_code: 'asc' },
    }),
  ])

  return <WriteOffTable items={writeOffs} churches={churches} />
}

export default function WriteOffsPage() {
  return (
    <div className="space-y-xl">
      <div>
        <h1 className="text-heading-2 font-bold text-foreground">Write-Offs</h1>
        <p className="mt-xs text-paragraph-small text-muted-foreground">
          Propose and track uncollectable debt write-offs.
        </p>
      </div>
      <Suspense fallback={<Skeleton className="h-[600px] rounded-xl" />}>
        <WriteOffsContent />
      </Suspense>
    </div>
  )
}