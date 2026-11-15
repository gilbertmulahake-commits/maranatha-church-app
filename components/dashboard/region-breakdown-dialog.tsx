'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertTriangle, ExternalLink, Trophy } from 'lucide-react'
import Link from 'next/link'

const slugify = (text: string) => text.toLowerCase().replace(/\s+/g, '-')

interface RegionScore {
  regionId: string
  regionName: string
  compliancePct: number
  finalScore: number
  incentiveTier: string
  outstandingAmount: number
  outstandingAnnual: number
  outstandingMonthly: number
}

interface RegionBreakdownDialogProps {
  region: RegionScore | null
  rank: number | null
  onClose: () => void
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function RegionBreakdownDialog({ region, rank, onClose }: RegionBreakdownDialogProps) {
  if (!region) return null

  const slug = slugify(region.regionName)

  return (
    <Dialog open={!!region} onOpenChange={(open) => !open && onClose()}>
      {/* Matches the proven working pattern from create-church-dialog.tsx */}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-heading-2 font-bold tracking-tight flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-600 shrink-0" />
            <span className="truncate">{region.regionName}</span>
          </DialogTitle>
          <DialogDescription className="text-paragraph-small text-muted-foreground">
            {rank !== null && `Ranked #${rank} of all regions · Final incentive score: `}
            <span className="font-bold text-foreground">{region.finalScore.toFixed(1)}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Compliance Block */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Compliance Rate
            </p>
            <div className="flex items-center gap-3">
              <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all" 
                  style={{ width: `${region.compliancePct}%` }} 
                />
              </div>
              <span className="text-xl font-bold tabular-nums text-foreground whitespace-nowrap">
                {region.compliancePct.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Arrears Block */}
          <div className="space-y-2 pt-4 border-t border-border/50">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Outstanding Arrears
            </p>
            <div className="flex items-baseline gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive self-center shrink-0" />
              <span className="text-2xl font-bold text-destructive tabular-nums">
                {formatCurrency(region.outstandingAmount)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Annual</p>
                <p className="text-sm font-bold text-destructive tabular-nums mt-0.5">
                  {formatCurrency(region.outstandingAnnual)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Monthly</p>
                <p className="text-sm font-bold text-destructive tabular-nums mt-0.5">
                  {formatCurrency(region.outstandingMonthly)}
                </p>
              </div>
            </div>
          </div>

          {/* Score & Tier */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Final Score
              </p>
              <p className="text-2xl font-bold text-primary tabular-nums">
                {region.finalScore.toFixed(1)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Incentive Tier
              </p>
              <Badge variant="outline" className={
                region.incentiveTier === 'Tier 1' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                region.incentiveTier === 'Tier 2' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                'bg-amber-50 text-amber-700 border-amber-200'
              }>
                {region.incentiveTier}
              </Badge>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4 gap-2">
          <Button variant="outline" onClick={onClose} className="h-9">
            Close
          </Button>
          <Link href={`/dashboard/regions/${slug}`}>
            <Button className="h-9 bg-primary hover:bg-primary/90">
              <ExternalLink className="mr-2 h-4 w-4" /> View Region Page
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}