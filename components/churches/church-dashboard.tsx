'use client'

import { useState, useMemo } from 'react'
import { ChurchKpiCards } from './church-kpi-cards'
import { ChurchTable, type ChurchRow } from './church-table'

export function ChurchDashboard({ 
  initialData, 
  nationalStats, 
  initialRegionFilter,
  initialStatusFilter
}: { 
  initialData: ChurchRow[]
  nationalStats: { total: number, compliant: number, partial: number, overdue: number }
  initialRegionFilter?: string 
  initialStatusFilter?: string
}) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter || 'All')
  const [regionFilter, setRegionFilter] = useState<string>(initialRegionFilter || 'All')

  // Table data: filtered by region + status + search
  const tableData = useMemo(() => {
    return initialData.filter((church) => {
      const s = search.toLowerCase()
      const matchesSearch = 
        church.church_code.toLowerCase().includes(s) ||
        church.church_name.toLowerCase().includes(s) ||
        church.treasurer_name.toLowerCase().includes(s) ||
        church.pastor_name.toLowerCase().includes(s)
      
      const matchesStatus = statusFilter === 'All' || church.status === statusFilter
      const matchesRegion = regionFilter === 'All' || church.region?.name === regionFilter
      return matchesSearch && matchesStatus && matchesRegion
    })
  }, [initialData, search, statusFilter, regionFilter])

  return (
    <div className="space-y-xl">
      {/* KPI cards always show national scope */}
      <ChurchKpiCards 
        localStats={nationalStats} 
        nationalStats={nationalStats}
        onFilterChange={(status) => {
          setStatusFilter(status)
        }}
      />
      
      <ChurchTable 
        data={tableData} 
        search={search} setSearch={setSearch}
        statusFilter={statusFilter} setStatusFilter={setStatusFilter}
        regionFilter={regionFilter} setRegionFilter={setRegionFilter}
      />
    </div>
  )
}