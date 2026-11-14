import { cn } from '@/lib/utils'
import { Table } from '@/components/ui/table'

interface TableShellProps {
  children: React.ReactNode
  className?: string
}

/**
 * Standard table container — single source of truth for table framing.
 *
 * Wraps `<Table>` in the border/bg/shadow container with `overflow-x-auto`
 * so wide tables scroll horizontally on narrow screens instead of clipping
 * columns. Per `ui-context.md` Section 6.2, this is mandatory for all tables.
 *
 * RULE: Never re-implement the `rounded-xl border ...` wrapper inline. Use
 * this component. To change table framing, edit this file — one place, all tables.
 */
export function TableShell({ children, className }: TableShellProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card shadow-sm overflow-x-auto',
        className
      )}
    >
      <Table>{children}</Table>
    </div>
  )
}