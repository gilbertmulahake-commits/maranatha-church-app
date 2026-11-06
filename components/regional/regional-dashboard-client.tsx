'use client'

import { useState } from 'react'
import { RegionalStatsSuccess } from '@/lib/actions/regional-actions'
import { RegionalKpiCards } from './regional-kpi-cards'
import { RegionalTable } from './regional-table'

export function RegionalDashboardClient({ stats }: { stats: RegionalStatsSuccess }) {
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // Filter the churches based on the KPI card clicked or search
  const filteredChurches = stats.churches.filter((church) => {
    const matchesSearch = 
      church.church_name.toLowerCase().includes(search.toLowerCase()) ||
      church.pastor_name.toLowerCase().includes(search.toLowerCase()) ||
      church.church_code.toLowerCase().includes(search.toLowerCase())
    
    const matchesStatus = statusFilter === 'All' || church.status === statusFilter

    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      <RegionalKpiCards 
        stats={stats} 
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
      />
    </div>
  )
}