import { Suspense } from 'react'
import { connection } from 'next/server'
import { getSystemUsers } from '@/lib/actions/user-actions'
import { prisma } from '@/lib/prisma'
import { UsersTable } from '@/components/users/users-table'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Skeleton } from '@/components/ui/skeleton'

async function UsersContent() {
  await connection()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  if (!dbUser || !dbUser.role.includes('NATIONAL')) {
    redirect('/dashboard')
  }

  const [users, regions, churches] = await Promise.all([
    getSystemUsers(),
    prisma.region.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.church.findMany({
      select: { id: true, church_name: true, church_code: true },
      orderBy: { church_code: 'asc' },
    }),
  ])

  return <UsersTable users={users} regions={regions} churches={churches} />
}

export default function UsersPage() {
  return (
    <div className="space-y-xl">
      <div>
        <h1 className="text-heading-2 font-bold text-foreground">User Management</h1>
        <p className="mt-xs text-paragraph-small text-muted-foreground">
          Manage system access, assign roles, and invite new staff.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="space-y-xl">
            <Skeleton className="h-[600px] rounded-xl" />
          </div>
        }
      >
        <UsersContent />
      </Suspense>
    </div>
  )
}