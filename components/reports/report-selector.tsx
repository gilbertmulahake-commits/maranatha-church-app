'use client'

import { useRouter } from 'next/navigation'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel
} from '@/components/ui/select'

const REPORTS = [
  {
    group: 'Financial',
    items: [
      { value: 'arrears', label: 'Arrears Report' },
      { value: 'cashbook', label: 'Daily Cashbook' },
    ]
  },
  {
    group: 'Registry',
    items: [
      { value: 'defunct', label: 'Defunct Churches' },
      { value: 'inactive', label: 'Inactive Churches' },
    ]
  },
  {
    group: 'Reconciliation',
    items: [
      { value: 'write-offs', label: 'Write-Off Register' },
    ]
  }
]

export function ReportSelector({ current }: { current?: string }) {
  const router = useRouter()

  return (
    <Select value={current || ''} onValueChange={(val) => { if (val) router.push(`/dashboard/reports/${val}`) }}>
      <SelectTrigger className="w-full sm:w-[260px] h-9 bg-card text-xs">
        <SelectValue placeholder="Select a report..." />
      </SelectTrigger>
      <SelectContent align="end" sideOffset={4}>
        {REPORTS.map(g => (
          <SelectGroup key={g.group}>
            <SelectLabel>{g.group}</SelectLabel>
            {g.items.map(item => (
              <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}