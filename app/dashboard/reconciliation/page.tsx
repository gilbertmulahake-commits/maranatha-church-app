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
import { IconAlertTriangle, IconClock, IconScale, IconFilePlus } from '@tabler/icons-react'
import { InfoTooltip } from '@/components/help/info-tooltip'
import { INFO_TOOLTIPS } from '@/lib/help/content'

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

  // Combine both pending payments and pending write-offs
  const totalPendingApprovals = stats.pendingPayments + stats.pendingWriteOffs

  return (
    <div className="space-y-xl">
      {/* THE PRO UI FIX: Single responsive grid for all 4 cards */}
      <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-4">
        
        {/* Card 1: Unmatched Webhooks */}
        <Link href="/dashboard/reconciliation/unmatched" className="block h-full">
          <Card className="h-full transition-all hover:border-primary hover:shadow-md cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-heading-4 font-bold">
                <IconAlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                Unmatched Webhooks
              </CardTitle>
              <CardDescription>Waiting for manual reconciliation</CardDescription>
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

        {/* Card 2: Pending Approvals */}
        <Link href="/dashboard/reconciliation/pending-approvals" className="block h-full">
          <Card className="h-full transition-all hover:border-primary hover:shadow-md cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-heading-4 font-bold">
                <IconClock className="h-5 w-5 text-amber-600 shrink-0" />
                Pending Approvals
              </CardTitle>
              <CardDescription>Awaiting Treasurer sign-off</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-heading-2 font-bold tabular-nums text-foreground">
                {totalPendingApprovals}
              </div>
              <div className="mt-2 text-paragraph-small text-muted-foreground">
                High-value payments and write-offs
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Card 3: Write-Offs */}
        <Link href="/dashboard/reconciliation/write-offs" className="block h-full">
          <Card className="h-full transition-all hover:border-primary hover:shadow-md cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-heading-4 font-bold">
                <IconScale className="h-5 w-5 text-primary shrink-0" />
                Write-Offs
              </CardTitle>
              <CardDescription>Bad debt proposals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-heading-2 font-bold tabular-nums text-foreground">
                {stats.pendingWriteOffs}
              </div>
              <div className="mt-2 text-paragraph-small text-muted-foreground">
                Must be approved by the Treasurer
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Card 4: Manual Entry */}
        <Link href="/dashboard/reconciliation/manual-entry" className="block h-full">
          <Card className="h-full transition-all hover:border-primary hover:shadow-md cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-heading-4 font-bold">
                <IconFilePlus className="h-5 w-5 text-emerald-600 shrink-0" />
                Manual Entry
              </CardTitle>
              <CardDescription>Record offline payments</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Using a visual CTA instead of a number to balance the layout */}
              <div className="text-heading-4 font-semibold text-primary mt-1">
                Create New
              </div>
              <div className="mt-2 text-paragraph-small text-muted-foreground">
                Cash, Cheque, or Bank Transfer
              </div>
            </CardContent>
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
        <div className="flex items-center gap-2">
          <h1 className="text-heading-2 font-bold text-foreground">Reconciliation</h1>
          <InfoTooltip
            label="Four-Eyes Approval"
            content={INFO_TOOLTIPS.fourEyes}
          />
        </div>
        <p className="mt-xs text-paragraph-small text-muted-foreground">
          Handle unmatched payments, manual entries, and write-offs.
        </p>
      </div>

      <Suspense
        fallback={
          // Updated skeleton to match the 4-column grid
          <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-40 rounded-xl" />
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