import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { Suspense } from 'react'
import { getDashboardStats } from '@/lib/actions/dashboard-actions'
import { getRegionalScores } from '@/lib/actions/scoring-actions'
import { Skeleton } from '@/components/ui/skeleton'
import { KpiGrid } from '@/components/ui/kpi-grid'
import { DashboardView } from '@/components/dashboard/dashboard-view'

async function DashboardContent() {
  await connection()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })

    if (dbUser?.role === 'REGIONAL_CHAIRMAN' || dbUser?.role === 'REGIONAL_TREASURER') {
      redirect('/dashboard/regional')
    }
    if (dbUser?.role === 'LOCAL_PASTOR' || dbUser?.role === 'CHURCH_TREASURER') {
      redirect('/dashboard/local')
    }
  }

  const [stats, scores] = await Promise.all([
    getDashboardStats(),
    getRegionalScores(),
  ])

  return <DashboardView stats={stats} scores={scores} />
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-xl @container/dashboard">
          <div className="flex flex-col @[600px]/dashboard:flex-row justify-between gap-4">
            <Skeleton className="h-[60px] w-[300px]" />
            <Skeleton className="h-[36px] w-[140px]" />
          </div>
          <div className="grid grid-cols-1 @[800px]/dashboard:grid-cols-12 gap-md">
            <Skeleton className="col-span-1 @[800px]/dashboard:col-span-6 @[1100px]/dashboard:col-span-7 h-[240px] rounded-2xl" />
            <Skeleton className="col-span-1 @[800px]/dashboard:col-span-6 @[1100px]/dashboard:col-span-5 h-[240px] rounded-xl" />
          </div>
          <KpiGrid>
            <Skeleton className="h-[140px] rounded-xl" />
            <Skeleton className="h-[140px] rounded-xl" />
            <Skeleton className="h-[140px] rounded-xl" />
            <Skeleton className="h-[140px] rounded-xl" />
          </KpiGrid>
          <div className="grid grid-cols-1 @[800px]/dashboard:grid-cols-12 gap-md">
            <Skeleton className="col-span-1 @[800px]/dashboard:col-span-6 @[1100px]/dashboard:col-span-7 h-[380px] rounded-xl" />
            <Skeleton className="col-span-1 @[800px]/dashboard:col-span-6 @[1100px]/dashboard:col-span-5 h-[380px] rounded-xl" />
          </div>
          <div className="grid grid-cols-1 @[800px]/dashboard:grid-cols-12 gap-md">
            <Skeleton className="col-span-1 @[800px]/dashboard:col-span-6 @[1100px]/dashboard:col-span-7 h-[300px] rounded-xl" />
            <Skeleton className="col-span-1 @[800px]/dashboard:col-span-6 @[1100px]/dashboard:col-span-5 h-[300px] rounded-xl" />
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  )
}