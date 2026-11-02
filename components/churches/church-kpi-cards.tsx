import { Building2, CheckCircle2, AlertCircle, XCircle, TrendingUp } from 'lucide-react'
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ChurchStats {
  total: number
  compliant: number
  partial: number
  overdue: number
}

interface ChurchKpiProps {
  localStats: ChurchStats
  nationalStats: ChurchStats
}

export function ChurchKpiCards({ 
  localStats = { total: 0, compliant: 0, partial: 0, overdue: 0 }, 
  nationalStats = { total: 0, compliant: 0, partial: 0, overdue: 0 } 
}: ChurchKpiProps) {
  
  // Helper to render "Local / National" fraction
  const Fraction = ({ local, national }: { local: number, national: number }) => (
    <span className="text-lg text-muted-foreground font-normal">
      {' '}/ {national.toLocaleString()}
    </span>
  )

  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs md:grid-cols-2 lg:grid-cols-4">
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Churches</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {localStats.total.toLocaleString()}
            <Fraction local={localStats.total} national={nationalStats.total} />
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <Building2 className="h-3 w-3" /> Filtered
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Out of national total
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Compliant</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums text-emerald-600 @[250px]/card:text-3xl">
            {localStats.compliant.toLocaleString()}
            <Fraction local={localStats.compliant} national={nationalStats.compliant} />
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
              <TrendingUp className="h-3 w-3" /> Rate
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Fully up to date <CheckCircle2 className="size-4 text-emerald-500" />
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Partial</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums text-amber-600 @[250px]/card:text-3xl">
            {localStats.partial.toLocaleString()}
            <Fraction local={localStats.partial} national={nationalStats.partial} />
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
              <AlertCircle className="h-3 w-3" /> Lagging
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Partially paid <AlertCircle className="size-4 text-amber-500" />
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Overdue</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums text-destructive @[250px]/card:text-3xl">
            {localStats.overdue.toLocaleString()}
            <Fraction local={localStats.overdue} national={nationalStats.overdue} />
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="text-destructive border-destructive/20 bg-destructive/10">
              <XCircle className="h-3 w-3" /> Action
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            No payment received <XCircle className="size-4 text-destructive" />
          </div>
        </CardFooter>
      </Card>

    </div>
  )
}