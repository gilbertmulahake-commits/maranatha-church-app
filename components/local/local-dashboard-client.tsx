'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LocalChurchStats } from '@/lib/actions/local-actions'
import { PayNowWizard } from '@/components/payments/pay-now-wizard'
import { LocalKpiCards } from './local-kpi-cards'
import { LocalPaymentHistory } from './local-payment-history'

export function LocalDashboardClient({ stats }: { stats: LocalChurchStats }) {
  const [filter, setFilter] = useState<'All' | 'Annual' | 'Monthly' | 'Mixed'>('All')
  const [wizardOpen, setWizardOpen] = useState(false)

  return (
    <div className="@container space-y-xl">
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={() => setWizardOpen(true)}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Pay Now
        </Button>
      </div>

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

      <PayNowWizard
        stats={stats}
        open={wizardOpen}
        onOpenChange={setWizardOpen}
      />
    </div>
  )
}