import { Trophy, Medal } from 'lucide-react'
import type { RegionalScoreData } from '@/lib/actions/scoring-actions'

export function RegionalLeaderboard({ scores }: { scores: RegionalScoreData[] }) {
  const topRegions = scores.slice(0, 5)

  function getTierStyles(tier: string) {
    switch (tier) {
      case 'Tier 1': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
      case 'Tier 2': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'Tier 3': return 'bg-amber-100 text-amber-700 border-amber-200'
      default: return 'bg-red-100 text-red-700 border-red-200'
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="p-xl border-b border-border">
        <div className="flex items-center gap-xs">
          <Trophy className="h-5 w-5 text-amber-500" />
          <h3 className="text-heading-4 font-medium text-foreground">Regional Leaderboard</h3>
        </div>
        <p className="text-paragraph-small text-muted-foreground">Top 5 performing regions based on the weighted score.</p>
      </div>

      <div className="divide-y divide-border">
        {topRegions.length === 0 ? (
          <div className="p-xl text-center text-paragraph-small text-muted-foreground">
            No regional scores available yet.
          </div>
        ) : (
          topRegions.map((region, index) => (
            <div key={region.regionId} className="flex items-center justify-between p-md hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-md">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-bold text-muted-foreground">
                  {index === 0 ? <Medal className="h-4 w-4 text-amber-500" /> : 
                   index === 1 ? <Medal className="h-4 w-4 text-slate-400" /> : 
                   index === 2 ? <Medal className="h-4 w-4 text-amber-700" /> : 
                   `#${index + 1}`}
                </div>
                
                <div>
                  <p className="font-medium text-foreground text-paragraph-small">{region.regionName}</p>
                  <p className="text-paragraph-mini text-muted-foreground">Compliance: {region.compliancePct.toFixed(1)}%</p>
                </div>
              </div>

              <div className="flex items-center gap-md">
                <div className="text-right">
                  <p className="text-paragraph-small font-bold tabular-nums text-foreground">{region.finalScore.toFixed(1)} pts</p>
                  <p className="text-paragraph-mini text-muted-foreground">Score</p>
                </div>
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-paragraph-mini font-medium border ${getTierStyles(region.incentiveTier)}`}>
                  {region.incentiveTier}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}