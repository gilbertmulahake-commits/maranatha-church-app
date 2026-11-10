'use client'

import { useState, useMemo } from 'react'
import { ChurchKpiCards } from './church-kpi-cards'
import { ChurchTable, type ChurchRow } from './church-table'

type PeriodStats = { total: number; compliant: number; partial: number; overdue: number; na: number }

/**
 * Count churches by their status for the active period view.
 */
function computePeriodStats(
  churches: ChurchRow[],
  periodView: 'month' | 'year'
): PeriodStats {
  let compliant = 0
  let partial = 0
  let overdue = 0
  let na = 0

  churches.forEach((church) => {
    const status =
      periodView === 'year'
        ? church.annualStatus ?? church.status
        : church.monthlyStatus ?? church.status

    if (status === 'Paid') compliant++
    else if (status === 'Partial') partial++
    else if (status === 'Overdue') overdue++
    else na++ // N/A
  })

  return { total: churches.length, compliant, partial, overdue, na }
}

export function ChurchDashboard({
  initialData,
  nationalStats,
  initialRegionFilter,
  initialStatusFilter,
}: {
  initialData: ChurchRow[]
  nationalStats: { total: number; compliant: number; partial: number; overdue: number; na: number }
  initialRegionFilter?: string
  initialStatusFilter?: string
}) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter || 'All')
  const [regionFilter, setRegionFilter] = useState<string>(initialRegionFilter || 'All')

  const [periodView, setPeriodView] = useState<'month' | 'year'>('year')

  // Calculate stats based on the active period view
  const periodStats = useMemo<PeriodStats>(() => {
    if (initialData.length === 0) return nationalStats
    return computePeriodStats(initialData, periodView)
  }, [initialData, nationalStats, periodView])

  // Filter the table data based on search, status, and region
  const tableData = useMemo(() => {
    return initialData.filter((church) => {
      const s = search.toLowerCase()
      const matchesSearch =
        church.church_code.toLowerCase().includes(s) ||
        church.church_name.toLowerCase().includes(s) ||
        church.treasurer_name.toLowerCase().includes(s) ||
        church.pastor_name.toLowerCase().includes(s)

      const activeStatus =
        periodView === 'year'
          ? church.annualStatus ?? church.status
          : church.monthlyStatus ?? church.status

      const matchesStatus = statusFilter === 'All' || activeStatus === statusFilter
      const matchesRegion = regionFilter === 'All' || church.region?.name === regionFilter

      return matchesSearch && matchesStatus && matchesRegion
    })
  }, [initialData, search, statusFilter, regionFilter, periodView])

  return (
    <div className="space-y-xl">
      <ChurchKpiCards
        localStats={periodStats}
        nationalStats={periodStats}
        periodView={periodView}
        onFilterChange={(status) => {
          setStatusFilter(status)
        }}
      />

      <ChurchTable
        data={tableData}
        search={search}
        setSearch={setSearch}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        regionFilter={regionFilter}
        setRegionFilter={setRegionFilter}
        periodView={periodView}
        setPeriodView={setPeriodView}
      />
    </div>
  )
}