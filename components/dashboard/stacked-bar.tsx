// components/dashboard/stacked-bar.tsx
// Reusable stacked composition bar for KPI cards.
// If 'total' is provided, the bar represents 100% of that total and segments fill the portion.
// If 'total' is omitted, the bar represents 100% of the segments themselves.

interface Segment {
  label: string
  value: number
  color: string // Tailwind bg class e.g., 'bg-blue-500'
}

interface StackedBarProps {
  segments: Segment[]
  total?: number
  height?: string
}

export function StackedBar({ segments, total, height = 'h-1.5' }: StackedBarProps) {
  const sum = segments.reduce((acc, s) => acc + s.value, 0)
  const denominator = total ?? sum

  return (
    <div className="w-full space-y-1.5">
      {/* The bar */}
      <div className={`w-full ${height} rounded-full bg-muted overflow-hidden flex`}>
        {segments.map((seg, i) => {
          if (seg.value <= 0) return null
          const pct = (seg.value / denominator) * 100
          return (
            <div
              key={i}
              className={`h-full ${seg.color} min-w-[2px]`}
              style={{ width: `${pct}%` }}
              title={seg.label}
            />
          )
        })}
      </div>
      
      {/* Legend */}
      <div className="flex items-center gap-3 flex-wrap text-paragraph-mini text-muted-foreground">
        {segments.filter(s => s.value > 0).map((seg, i) => (
          <span key={i} className="flex items-center gap-1">
            <span className={`h-1.5 w-1.5 rounded-full ${seg.color} shrink-0`} />
            {seg.label}
          </span>
        ))}
      </div>
    </div>
  )
}