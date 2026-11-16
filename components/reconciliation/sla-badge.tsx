import { Badge } from '@/components/ui/badge'
import { IconClock } from '@tabler/icons-react'

export function SlaBadge({
  status,
  ageDays,
}: {
  status: 'green' | 'yellow' | 'red'
  ageDays: number
}) {
  if (status === 'red') {
    return (
      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px]">
        <IconClock className="mr-1 h-3 w-3" /> {ageDays}d overdue
      </Badge>
    )
  }
  if (status === 'yellow') {
    return (
      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
        <IconClock className="mr-1 h-3 w-3" /> {ageDays}d
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
      <IconClock className="mr-1 h-3 w-3" /> {ageDays}d
    </Badge>
  )
}