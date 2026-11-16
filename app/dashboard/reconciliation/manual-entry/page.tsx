import { Suspense } from 'react'
import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { isFinanceAdmin } from '@/lib/auth/roles'
import { ManualEntryForm } from '@/components/reconciliation/manual-entry-form'
import { Skeleton } from '@/components/ui/skeleton'

async function ManualEntryContent() {
  await connection()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  if (!dbUser) redirect('/login')

  if (!isFinanceAdmin(dbUser.role) && dbUser.role !== 'NATIONAL_TREASURER') {
    redirect('/dashboard')
  }

  const churches = await prisma.church.findMany({
    where: { is_defunct: false },
    select: { id: true, church_code: true, church_name: true },
    orderBy: { church_code: 'asc' },
  })

  return <ManualEntryForm churches={churches} />
}

export default function ManualEntryPage() {
  return (
    <div className="space-y-xl">
      <div>
        <h1 className="text-heading-2 font-bold text-foreground">Manual Entry</h1>
        <p className="mt-xs text-paragraph-small text-muted-foreground">
          Record a cash, cheque, or direct bank transfer payment.
        </p>
      </div>
      <Suspense fallback={<Skeleton className="h-[600px] rounded-xl" />}>
        <ManualEntryContent />
      </Suspense>
    </div>
  )
}