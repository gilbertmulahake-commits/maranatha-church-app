'use client'

import { useState } from 'react'
import { LocalChurchStats } from '@/lib/actions/local-actions'
import { LocalKpiCards } from './local-kpi-cards'
import { LocalPaymentHistory } from './local-payment-history'

export function LocalDashboardClient({ stats }: { stats: LocalChurchStats }) {
  const [filter, setFilter] = useState<'All' | 'Annual' | 'Monthly'>('All')

  // Filter the payments based on the card clicked
  const filteredPayments = stats.payments.filter((payment) => {
    if (filter === 'All') return true
    return payment.payment_type === filter
  })

  return (
    <div className="space-y-xl">
      <LocalKpiCards stats={stats} onFilterChange={setFilter} />
      
      {/* Show the filter context in the table title (optional UX improvement) */}
      <div className="space-y-2">
        {filter !== 'All' && (
          <p className="text-paragraph-small text-primary font-medium">
            Showing {filter} payments only. Click "Total Contributions" to reset.
          </p>
        )}
        <LocalPaymentHistory payments={filteredPayments} />
      </div>
    </div>
  )
}