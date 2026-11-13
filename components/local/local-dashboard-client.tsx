'use client'

import { useState } from 'react'
import { LocalChurchStats } from '@/lib/actions/local-actions'
import { LocalKpiCards } from './local-kpi-cards'
import { LocalPaymentHistory } from './local-payment-history'

export function LocalDashboardClient({ stats }: { stats: LocalChurchStats }) {
  // 1. Update state to include 'Mixed'
  const [filter, setFilter] = useState<'All' | 'Annual' | 'Monthly' | 'Mixed'>('All')

  return (
    <div className="@container space-y-xl">
      {/* 2. Pass activeFilter so the clicked card gets highlighted */}
      <LocalKpiCards 
        stats={stats} 
        activeFilter={filter} 
        onFilterChange={setFilter} 
      />
      
      <div className="space-y-2">
        {filter !== 'All' && (
          <p className="text-paragraph-small text-primary font-medium">
            Showing {filter} payments only. Click {"\"Total Contributions\""} to reset.
          </p>
        )}
        
        {/* 3. Pass RAW payments and let the table handle the accurate filtering */}
        <LocalPaymentHistory 
          payments={stats.payments} 
          activeFilter={filter} 
          onFilterChange={setFilter} 
        />
      </div>
    </div>
  )
}