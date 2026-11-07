'use client'

import { useState } from 'react'
import { RegionKpiCards } from './region-kpi-cards'
import { RegionTable, type RegionRow } from './region-table'

export function RegionDashboard({ 
  initialData, 
  stats 
}: { 
  initialData: RegionRow[]
  stats: any
}) {
  // State to track which KPI card was clicked (All, AtRisk, Top)
  const [tableFilter, setTableFilter] = useState('All')

  // Filter the data based on the KPI clicked
  const filteredData = initialData.filter((region) => {
    if (tableFilter === 'AtRisk') return region.compliancePct < 50
    if (tableFilter === 'Top') return region.compliancePct > 80
    return true
  })

  return (
    <div className="space-y-xl">
      {/* Pass the setter so KPI cards can filter the table */}
      <RegionKpiCards stats={stats} onFilterChange={setTableFilter} />
      
      {/* Pass the filtered data to the table */}
      <RegionTable data={filteredData} />
    </div>
  )
}