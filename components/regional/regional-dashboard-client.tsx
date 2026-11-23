'use client'

import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RegionalKpiCards } from './regional-kpi-cards'
import { RegionalTable } from './regional-table'
import { MyDeletionRequestsTable } from './my-deletion-requests-table'
import type { RegionalStatsSuccess } from '@/lib/actions/regional-actions'
import type { ChurchDeletionRequestRow } from '@/lib/actions/church-deletion-request-actions'

export function RegionalDashboardClient({
  stats,
  userRole,
  pendingDeletions = {},
  myDeletionRequests = [],
}: {
  stats: RegionalStatsSuccess
  userRole: 'NATIONAL' | 'REGIONAL'
  pendingDeletions?: Record<string, { id: string; daysOld: number }>
  myDeletionRequests?: ChurchDeletionRequestRow[]
}) {
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [periodView, setPeriodView] = useState<'month' | 'year'>('year')

  const filteredChurches = useMemo(() => {
    return stats.churches.filter((church) => {
      const matchesSearch =
        church.church_name.toLowerCase().includes(search.toLowerCase()) ||
        church.pastor_name.toLowerCase().includes(search.toLowerCase()) ||
        church.church_code.toLowerCase().includes(search.toLowerCase())

      const activeStatus =
        periodView === 'year'
          ? church.annualStatus ?? church.status
          : church.monthlyStatus ?? church.status

      const matchesStatus = statusFilter === 'All' || activeStatus === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [stats.churches, search, statusFilter, periodView])

  const churchesContent = (
    <>
      <RegionalKpiCards
        stats={stats}
        periodView={periodView}
        onFilterChange={(status) => {
          setStatusFilter(status)
          setCurrentPage(1)
        }}
      />

      <RegionalTable
        churches={filteredChurches}
        regionName={stats.regionName}
        search={search}
        setSearch={setSearch}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        userRole={userRole}
        periodView={periodView}
        setPeriodView={setPeriodView}
        pendingDeletions={pendingDeletions}
      />
    </>
  )

  // National viewers cannot propose deletions — no tabs, same view as before.
  if (userRole === 'NATIONAL') {
    return <div className="@container space-y-xl">{churchesContent}</div>
  }

  const pendingCount = myDeletionRequests.filter((r) => r.status === 'Pending').length

  return (
    <div className="@container">
      <Tabs defaultValue="churches" className="gap-4">
        <TabsList variant="line">
          <TabsTrigger value="churches">Churches</TabsTrigger>
          <TabsTrigger value="requests">
            My Deletion Requests
            {pendingCount > 0 && (
              <Badge
                variant="outline"
                className="ml-1.5 bg-amber-50 text-amber-700 border-amber-200 text-[10px] px-1.5"
              >
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="churches" className="space-y-xl" keepMounted>
          {churchesContent}
        </TabsContent>

        <TabsContent value="requests">
          <MyDeletionRequestsTable items={myDeletionRequests} />
        </TabsContent>
      </Tabs>
    </div>
  )
}