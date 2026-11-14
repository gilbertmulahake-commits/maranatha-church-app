import { CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface KpiValueProps {
  children: React.ReactNode
  className?: string
}

/**
 * Standard KPI card value — single source of truth for KPI typography.
 *
 * Base:      heading-3 (~20px) — fits KES 17,600,000+ in 268px cards
 * @[300px]:  heading-2 (~24px) — for medium-width cards (300–419px)
 * @[420px]:  heading-1 (~32px) — for wide cards (420px+)
 *
 * Composes with `<KpiGrid>` (see kpi-grid.tsx). Requires `@container/card`
 * on the Card wrapper — already applied by the standard `cardClasses`.
 *
 * RULE: Never re-implement the KPI value font tiers inline. If the
 * typography standard changes, change it HERE — one file, all cards.
 */
export function KpiValue({ children, className }: KpiValueProps) {
  return (
    <CardTitle
      className={cn(
        'text-heading-3 font-bold tabular-nums truncate mt-1',
        '@[300px]/card:text-heading-2',
        '@[420px]/card:text-heading-1',
        className
      )}
    >
      {children}
    </CardTitle>
  )
}