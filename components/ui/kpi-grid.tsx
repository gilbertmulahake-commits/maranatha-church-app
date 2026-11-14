import { cn } from '@/lib/utils'

interface KpiGridProps {
  children: React.ReactNode
  className?: string
}

/**
 * Standard 3-tier KPI grid.
 * 1 column < 600px container, 2 cols 600–900px, 4 cols > 900px.
 * Requires `@container` on an ancestor (dashboard layout already provides it).
 *
 * NEVER re-implement this grid in a component. If the standard changes,
 * change it HERE and every KPI row across the app updates.
 */
export function KpiGrid({ children, className }: KpiGridProps) {
  return (
    <div className={cn(
      "grid grid-cols-1 gap-md @[600px]:grid-cols-2 @[1100px]:grid-cols-4",
      className
    )}>
      {children}
    </div>
  )
}