import { Suspense } from 'react'
import { connection } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuditLogs } from '@/lib/actions/audit-actions'
import { AuditLogTable } from '@/components/audit/audit-log-table'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Skeleton } from '@/components/ui/skeleton'
import { isNationalLevel } from '@/lib/auth/roles'

async function AuditLogsContent() {
  await connection()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  
  // RBAC: Only SYSTEM_ADMIN + National roles can access
  if (!dbUser || !isNationalLevel(dbUser.role)) {
    redirect('/dashboard')
  }

  const logs = await getAuditLogs()

  return <AuditLogTable logs={logs} />
}

export default function AuditLogsPage() {
  return (
    <div className="space-y-xl">
      <div>
        <h1 className="text-heading-2 font-bold text-foreground">System Audit Logs</h1>
        <p className="mt-xs text-paragraph-small text-muted-foreground">
          Immutable forensic trail of all critical system mutations.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="space-y-xl">
            <Skeleton className="h-[600px] rounded-xl" />
          </div>
        }
      >
        <AuditLogsContent />
      </Suspense>
    </div>
  )
}