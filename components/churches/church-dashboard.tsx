'use client'

import { useState, useMemo } from 'react'
import { ChurchKpiCards } from './church-kpi-cards'
import { ChurchTable, type ChurchRow } from './church-table'

export function ChurchDashboard({ 
  initialData, 
  nationalStats, 
  initialRegionFilter 
}: { 
  initialData: ChurchRow[]
  nationalStats: { total: number, compliant: number, partial: number, overdue: number }
  initialRegionFilter?: string 
}) {
  // Shared State
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [regionFilter, setRegionFilter] = useState<string>(initialRegionFilter || 'All')

  // Calculate filtered data
  const filteredData = useMemo(() => {
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

  // Calculate local stats based on the filtered data
  const localStats = useMemo(() => {
    let compliant = 0, partial = 0, overdue = 0
    filteredData.forEach(c => {
      if (c.status === 'Paid') compliant++
      else if (c.status === 'Partial') partial++
      else overdue++
    })
    return { total: filteredData.length, compliant, partial, overdue }
  }, [filteredData])

  return (
    <div className="space-y-6">
      <ChurchKpiCards localStats={localStats} nationalStats={nationalStats} />
      
      <ChurchTable 
        data={filteredData} 
        search={search} setSearch={setSearch}
        statusFilter={statusFilter} setStatusFilter={setStatusFilter}
        regionFilter={regionFilter} setRegionFilter={setRegionFilter}
      />
    </div>
  )
}