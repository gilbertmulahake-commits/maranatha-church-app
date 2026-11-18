'use client'

import { useRouter } from 'next/navigation'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel
} from '@/components/ui/select'
import { getReportsForRole } from '@/lib/utils/report-registry'

const GROUP_ORDER = ['Financial', 'Analytics', 'Registry', 'Reconciliation']

export function ReportSelector({ current, role }: { current?: string; role: string }) {
  const router = useRouter()

  const visible = getReportsForRole(role)

  // Group visible reports by `group`, preserving GROUP_ORDER; empty groups omitted.
  const groups = GROUP_ORDER
    .map((group) => ({
      group,
      items: visible.filter((r) => r.group === group),
    }))
    .filter((g) => g.items.length > 0)

  return (
    <Select
      value={current || ''}
      onValueChange={(val) => { if (val) router.push(`/dashboard/reports/${val}`) }}
    >
      <SelectTrigger className="w-full sm:w-[260px] h-9 bg-card text-xs">
        <SelectValue placeholder="Select a report..." />
      </SelectTrigger>
      <SelectContent align="end" sideOffset={4}>
        {groups.map((g) => (
          <SelectGroup key={g.group}>
            <SelectLabel>{g.group}</SelectLabel>
            {g.items.map((item) => (
              <SelectItem key={item.slug} value={item.slug}>{item.title}</SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}