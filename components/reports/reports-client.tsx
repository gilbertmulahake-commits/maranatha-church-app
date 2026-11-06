'use client'

import { useState } from 'react'
import { ArrearsRow } from '@/lib/actions/report-actions'
import { ArrearsTable } from './arrears-table'
import { CashbookTable } from './cashbook-table'

export function ReportsClient({ initialArrears }: { initialArrears: ArrearsRow[] }) {
  const [activeTab, setActiveTab] = useState<'arrears' | 'cashbook'>('arrears')

  return (
    <div className="space-y-xl">
      {/* 
        We use inline-flex and width: fit-content to guarantee the container 
        perfectly hugs the buttons, avoiding the w-full layout fights.
      */}
      <div 
        className="inline-flex items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground border border-border"
        style={{ width: 'fit-content' }}
      >
        <button
          onClick={() => setActiveTab('arrears')}
          className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-6 py-1.5 text-paragraph-small font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            activeTab === 'arrears'
              ? 'bg-background text-foreground shadow-sm'
              : 'hover:bg-background/50 hover:text-foreground'
          }`}
        >
          Arrears Report
        </button>
        <button
          onClick={() => setActiveTab('cashbook')}
          className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-6 py-1.5 text-paragraph-small font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            activeTab === 'cashbook'
              ? 'bg-background text-foreground shadow-sm'
              : 'hover:bg-background/50 hover:text-foreground'
          }`}
        >
          Daily Cashbook
        </button>
      </div>

      <div className="pt-2">
        {activeTab === 'arrears' && <ArrearsTable data={initialArrears} />}
        {activeTab === 'cashbook' && <CashbookTable />}
      </div>
    </div>
  )
}