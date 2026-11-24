import { Suspense } from 'react'
import { connection } from 'next/server'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { SiteHeader } from '@/components/layout/site-header'
import { getCurrentUserRole } from '@/lib/actions/auth-actions'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { Skeleton } from '@/components/ui/skeleton'
import { getUnresolvedCounts } from '@/lib/actions/reconciliation-actions'
import { getPendingChurchDeletionCount } from '@/lib/actions/church-deletion-request-actions'
import { isFinanceAdmin } from '@/lib/auth/roles'
import { HelpDrawerProvider } from '@/components/help/help-drawer-provider'

async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  await connection()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Unit 16.2: User lifecycle enforcement
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })

  if (dbUser && !dbUser.is_active) {
    await supabase.auth.signOut()
    redirect('/login?error=account_disabled')
  }

  if (dbUser && dbUser.requires_password_reset) {
    redirect('/force-password-reset')
  }

  const role = await getCurrentUserRole()

  // Unit 17: Fetch unresolved reconciliation counts — only for roles that can see the tab
  let unresolvedCount = 0
  const canSeeReconciliation =
    role !== null &&
    (isFinanceAdmin(role) || role === 'NATIONAL_TREASURER')

  if (canSeeReconciliation) {
    const counts = await getUnresolvedCounts()
    unresolvedCount = counts.total
  }

  // Unit 20.6b: Pending church deletion requests (self-guarded, returns 0 on failure)
  const pendingDeletionCount = await getPendingChurchDeletionCount()

  return (
    <HelpDrawerProvider role={role}>
      <SidebarProvider
        style={
          {
            '--sidebar-width': '16rem',
            '--header-height': '4rem',
          } as React.CSSProperties
        }
      >
        <AppSidebar
          role={role}
          userEmail={user.email}
          firstName={dbUser?.first_name ?? null}
          lastName={dbUser?.last_name ?? null}
          unresolvedCount={unresolvedCount}
          pendingDeletionCount={pendingDeletionCount}
        />

        <SidebarInset className="flex-1 min-w-0 flex flex-col h-svh overflow-hidden">
          <SiteHeader />

          <main
            data-tour="main-content"
            className="flex-1 min-h-0 w-full min-w-0 overflow-y-auto"
          >
            <div className="@container/main mx-auto flex w-full min-w-0 max-w-[1440px] flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
              {children}
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </HelpDrawerProvider>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full bg-background">
          <div className="w-64 shrink-0 border-r border-border p-4 space-y-4 hidden md:block">
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-8 w-full rounded-md" />
            <Skeleton className="h-8 w-full rounded-md" />
          </div>
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="h-16 border-b border-border px-6 flex items-center">
              <Skeleton className="h-6 w-[200px] rounded-md" />
            </div>
            <div className="p-6 space-y-6">
              <Skeleton className="h-[200px] w-full rounded-xl" />
            </div>
          </div>
        </div>
      }
    >
      <AuthenticatedLayout>{children}</AuthenticatedLayout>
    </Suspense>
  )
}