import { Trophy, Medal, Award } from 'lucide-react'
import type { RegionalScoreData } from '@/lib/actions/scoring-actions'

export function RegionalLeaderboard({ scores }: { scores: RegionalScoreData[] }) {
  // Take only the top 5 for the dashboard
  const topRegions = scores.slice(0, 5)

  function getTierStyles(tier: string) {
    switch (tier) {
      case 'Tier 1': return 'bg-[#D1FAE5] text-[#10B981]' // Green
      case 'Tier 2': return 'bg-[#DBEAFE] text-[#2563EB]' // Blue
      case 'Tier 3': return 'bg-[#FEF3C7] text-[#F59E0B]' // Yellow
      default: return 'bg-[#FEE2E2] text-[#EF4444]'       // Red
    }
  }

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
      <div className="p-6 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-[#F59E0B]" />
          <h3 className="text-lg font-semibold text-[#0F172A]">Regional Leaderboard</h3>
        </div>
        <p className="text-sm text-[#64748B]">Top 5 performing regions based on the weighted score.</p>
      </div>

      <div className="divide-y divide-[#E2E8F0]">
        {topRegions.length === 0 ? (
          <div className="p-6 text-center text-sm text-[#64748B]">
            No regional scores available yet.
          </div>
        ) : (
          topRegions.map((region, index) => (
            <div key={region.regionId} className="flex items-center justify-between p-4 hover:bg-[#F8FAFC] transition-colors">
              <div className="flex items-center gap-4">
                {/* Rank Indicator */}
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F1F5F9] font-bold text-[#64748B]">
                  {index === 0 ? <Medal className="h-4 w-4 text-[#F59E0B]" /> : 
                   index === 1 ? <Medal className="h-4 w-4 text-[#94A3B8]" /> : 
                   index === 2 ? <Medal className="h-4 w-4 text-[#B45309]" /> : 
                   `#${index + 1}`}
                </div>
                
                <div>
                  <p className="font-medium text-[#0F172A]">{region.regionName}</p>
                  <p className="text-xs text-[#64748B]">Compliance: {region.compliancePct.toFixed(1)}%</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-bold tabular-nums text-[#0F172A]">{region.finalScore.toFixed(1)} pts</p>
                  <p className="text-xs text-[#64748B]">Score</p>
                </div>
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getTierStyles(region.incentiveTier)}`}>
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