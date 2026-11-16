import { Suspense } from 'react'
import { connection } from 'next/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getReconciliationHubStats } from '@/lib/actions/reconciliation-actions'
import { isFinanceAdmin } from '@/lib/auth/roles'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { IconAlertTriangle, IconClock, IconScale } from '@tabler/icons-react'

async function ReconciliationContent() {
  await connection()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  if (!dbUser) redirect('/login')

  const allowed =
    isFinanceAdmin(dbUser.role) || dbUser.role === 'NATIONAL_TREASURER'
  if (!allowed) redirect('/dashboard')

  const stats = await getReconciliationHubStats()

  return (
    <div className="space-y-xl">
      <div className="grid grid-cols-1 gap-md md:grid-cols-3">
        {/* Unmatched Webhooks Card */}
        <Link href="/dashboard/reconciliation/unmatched">
          <Card className="h-full transition-all hover:border-primary hover:shadow-md cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-heading-4 font-bold">
                <IconAlertTriangle className="h-5 w-5 text-destructive" />
                Unmatched Webhooks
              </CardTitle>
              <CardDescription>Payments waiting for manual reconciliation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-heading-2 font-bold tabular-nums text-foreground">
                {stats.unmatched}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                  {stats.sla.green} &lt;7d
                </Badge>
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                  {stats.sla.yellow} 7-30d
                </Badge>
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px]">
                  {stats.sla.red} 30d+
                </Badge>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Pending Approvals Card */}
        <Link href="/dashboard/reconciliation/pending-approvals">
          <Card className="h-full transition-all hover:border-primary hover:shadow-md cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-heading-4 font-bold">
                <IconClock className="h-5 w-5 text-amber-600" />
                Pending Approvals
              </CardTitle>
              <CardDescription>Awaiting Treasurer sign-off (four-eyes)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-heading-2 font-bold tabular-nums text-foreground">
                {stats.pendingPayments}
              </div>
              <div className="mt-2 text-paragraph-small text-muted-foreground">
                High-value payments and corrections
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Write-Offs Card */}
        <Link href="/dashboard/reconciliation/write-offs">
          <Card className="h-full transition-all hover:border-primary hover:shadow-md cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-heading-4 font-bold">
                <IconScale className="h-5 w-5 text-primary" />
                Write-Offs
              </CardTitle>
              <CardDescription>Bad debt proposals awaiting approval</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-heading-2 font-bold tabular-nums text-foreground">
                {stats.pendingWriteOffs}
              </div>
              <div className="mt-2 text-paragraph-small text-muted-foreground">
                Must be approved by the National Treasurer
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-md md:grid-cols-2">
        <Link href="/dashboard/reconciliation/manual-entry">
          <Card className="h-full transition-all hover:border-primary hover:shadow-md cursor-pointer">
            <CardHeader>
              <CardTitle className="text-heading-4 font-bold">Manual Entry</CardTitle>
              <CardDescription>Record a cash or cheque payment</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/dashboard/reconciliation/manual-entry?tab=pending">
          <Card className="h-full transition-all hover:border-primary hover:shadow-md cursor-pointer">
            <CardHeader>
              <CardTitle className="text-heading-4 font-bold">Pending Payments</CardTitle>
              <CardDescription>Review high-value entries awaiting approval</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  )
}

export default function ReconciliationPage() {
  return (
    <div className="space-y-xl">
      <div>
        <h1 className="text-heading-2 font-bold text-foreground">Reconciliation</h1>
        <p className="mt-xs text-paragraph-small text-muted-foreground">
          Handle unmatched payments, manual entries, and write-offs.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="grid grid-cols-1 gap-md md:grid-cols-3">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        }
      >
        <ReconciliationContent />
      </Suspense>
    </div>
  )
}