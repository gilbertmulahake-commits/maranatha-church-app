import { Suspense } from 'react'
import { connection } from 'next/server'
import { AppShell } from '@/components/layout/app-shell'
import { getSystemUsers } from '@/lib/actions/user-actions'
import { prisma } from '@/lib/prisma'
import { UsersTable } from '@/components/users/users-table'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

async function UsersContent() {
  // Security check before fetching anything
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  if (!dbUser || !dbUser.role.includes('NATIONAL')) {
    redirect('/dashboard')
  }

  // Fetch data in parallel
  const [users, regions, churches] = await Promise.all([
    getSystemUsers(),
    prisma.region.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.church.findMany({ select: { id: true, church_name: true, church_code: true }, orderBy: { church_code: 'asc' } })
  ])

  return (
    <div className="space-y-xl" style={{ width: '100%', maxWidth: '100%' }}>
      <div>
        <h1 className="text-heading-2 font-medium text-foreground">User Management</h1>
        <p className="mt-xs text-paragraph-small text-muted-foreground">
          Manage system access, assign roles, and invite new staff.
        </p>
      </div>

      <UsersTable users={users} regions={regions} churches={churches} />
    </div>
  )
}

async function Content() {
  await connection()
  return (
    <AppShell>
      <Suspense fallback={<div className="p-xl text-muted-foreground">Loading users...</div>}>
        <UsersContent />
      </Suspense>
    </AppShell>
  )
}

export default function UsersPage() {
  return (
    <Suspense fallback={<div className="p-xl text-muted-foreground">Loading...</div>}>
      <Content />
    </Suspense>
  )
}