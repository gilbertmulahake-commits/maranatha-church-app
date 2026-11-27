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
  const [activeTab, setActiveTab] = useState('churches')
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

  const kpiCards = (
    <RegionalKpiCards
      stats={stats}
      periodView={periodView}
      onFilterChange={(status) => {
        setStatusFilter(status)
        setCurrentPage(1)
      }}
    />
  )

  const churchTable = (
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
      hideHeader={userRole === 'REGIONAL'}
    />
  )

  // National viewers cannot propose deletions — no tabs, same view as before.
  if (userRole === 'NATIONAL') {
    return (
      <div className="@container space-y-xl">
        {kpiCards}
        {churchTable}
      </div>
    )
  }

  const pendingCount = myDeletionRequests.filter((r) => r.status === 'Pending').length

  return (
    <div className="@container space-y-xl">
      {kpiCards}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b pb-4">
          <div className="space-y-1">
            <h2 className="text-heading-3 font-bold text-foreground">
              {activeTab === 'churches' ? 'Churches in Region' : 'My Deletion Requests'}
            </h2>
            <p className="text-paragraph-small text-muted-foreground">
              {activeTab === 'churches'
                ? `${filteredChurches.length} churches · ${userRole === 'REGIONAL' ? 'Chairman View' : 'National View'}`
                : 'All deletion requests you have submitted. Withdraw a pending request to cancel it.'}
            </p>
          </div>

          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="churches" className="flex-1 sm:flex-none">Churches</TabsTrigger>
            <TabsTrigger value="requests" className="flex-1 sm:flex-none">
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
        </div>

        <TabsContent value="churches" keepMounted>
          {churchTable}
        </TabsContent>

        <TabsContent value="requests">
          <MyDeletionRequestsTable items={myDeletionRequests} />
        </TabsContent>
      </Tabs>
    </div>
  )
}