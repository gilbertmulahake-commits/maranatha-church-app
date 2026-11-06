'use client'

import { useState, useMemo } from 'react'
import { RegionalKpiCards } from './regional-kpi-cards'
import { RegionalTable } from './regional-table'
import type { RegionalStatsSuccess } from '@/lib/actions/regional-actions'

export function RegionalDashboardClient({ stats }: { stats: RegionalStatsSuccess }) {
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // Period view — controls which of annualStatus / monthlyStatus drives
  // the KPI counts, the table badge, AND the status filter.
  const [periodView, setPeriodView] = useState<'month' | 'year'>('year')

  /**
   * Filter the table. The status filter MUST match the active period status
   * (annual vs monthly) — otherwise clicking "Overdue" on the Month view
   * would silently filter by annual status.
   */
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

  return (
    <div className="space-y-xl">
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
        search={search}
        setSearch={setSearch}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        userRole="REGIONAL"
        periodView={periodView}
        setPeriodView={setPeriodView}
      />
    </div>
  )
}