import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Trophy, ChevronRight, Medal } from 'lucide-react'
import Link from 'next/link'

// Helper to convert "Northern Region" to "northern-region"
const slugify = (text: string) => text.toLowerCase().replace(/\s+/g, '-')

interface LeaderboardProps {
  scores: {
    regionId: string
    regionName: string
    compliancePct: number
    finalScore: number
    incentiveTier: string
  }[]
}

export function RegionalLeaderboard({ scores }: LeaderboardProps) {
  const sorted = [...scores].sort((a, b) => b.finalScore - a.finalScore)

  if (sorted.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-heading-4">
            <Trophy className="h-5 w-5 text-amber-600" /> Regional Leaderboard
          </CardTitle>
          <CardDescription>Ranked by final incentive score (40/30/20/10).</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12 text-paragraph-small text-muted-foreground">
          No regional scores available yet.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-heading-4">
            <Trophy className="h-5 w-5 text-amber-600" /> Regional Leaderboard
          </CardTitle>
          <CardDescription>Ranked by final incentive score (40/30/20/10).</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="rounded-b-xl overflow-hidden border-t border-border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[80px] text-center">Rank</TableHead>
                <TableHead>Region</TableHead>
                <TableHead className="w-[300px]">Compliance</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead className="text-right">Tier</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((region, index) => {
                const rank = index + 1
                const isTop3 = rank <= 3
                
                return (
                  <TableRow key={region.regionId} className="group hover:bg-muted/50 cursor-pointer">
                    <TableCell className="text-center font-bold">
                      {isTop3 ? (
                        <div className="flex justify-center">
                          {rank === 1 && <Trophy className="h-5 w-5 text-amber-600" />}
                          {rank === 2 && <Medal className="h-5 w-5 text-muted-foreground" />}
                          {rank === 3 && <Medal className="h-5 w-5 text-amber-800" />}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">{rank}</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      <Link href={`/dashboard/regions/${slugify(region.regionName)}`} className="group-hover:underline">
                        {region.regionName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-full max-w-[200px] rounded-full bg-muted overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full" 
                            style={{ width: `${region.compliancePct}%` }} 
                          />
                        </div>
                        <span className="text-paragraph-small font-medium tabular-nums text-muted-foreground w-12 text-right">
                          {region.compliancePct.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold tabular-nums text-primary">
                      {region.finalScore.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={
                        region.incentiveTier === 'Tier 1' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        region.incentiveTier === 'Tier 2' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }>
                        {region.incentiveTier}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/dashboard/regions/${slugify(region.regionName)}`}>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}