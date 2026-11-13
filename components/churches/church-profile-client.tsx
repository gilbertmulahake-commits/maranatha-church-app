'use client'

import { useState } from 'react'
import { LocalChurchStats } from '@/lib/actions/local-actions'
import { LocalKpiCards } from '@/components/local/local-kpi-cards'
import { LocalPaymentHistory } from '@/components/local/local-payment-history'

export function ChurchProfileClient({ stats }: { stats: LocalChurchStats }) {
  const [filter, setFilter] = useState<'All' | 'Annual' | 'Monthly' | 'Mixed'>('All')

  return (
    <div className="@container space-y-xl">
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
        
        <LocalPaymentHistory 
          payments={stats.payments} 
          activeFilter={filter} 
          onFilterChange={setFilter} 
        />
      </div>
    </div>
  )
}