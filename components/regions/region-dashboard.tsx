'use client'

import { useState, useMemo } from 'react'
import { RegionTable, type RegionRow } from './region-table'
import { RegionKpiCards } from './region-kpi-cards'

interface RegionDashboardProps {
  initialData: RegionRow[]
  stats: {
    totalCollected: number
    totalCollectedAnnual: number
    totalCollectedMonthly: number
    totalArrears: number
    totalArrearsAnnual: number
    totalArrearsMonthly: number
    averageCompliance: number
    regionsAtRisk: number
    topRegionName: string
    topRegionPct: number
    topRegionTieCount: number
  }
}

export function RegionDashboard({ initialData, stats }: RegionDashboardProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [currentPage, setCurrentPage] = useState(1)

  return (
    <div className="space-y-xl">
      <RegionKpiCards stats={stats} />
      
      <RegionTable
        data={initialData}
        search={search}
        setSearch={setSearch}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
      />
    </div>
  )
}