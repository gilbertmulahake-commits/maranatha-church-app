'use server'

import { prisma } from '@/lib/prisma'
import { getExpectedUpToDate, getPeriodStatus } from '@/lib/utils/financial'

export type RegionalScoreData = {
  regionId: string
  regionName: string
  compliancePct: number
  timelinessPct: number
  reportingAccuracy: number
  leadershipEngagement: number
  finalScore: number
  incentiveTier: 'Tier 1' | 'Tier 2' | 'Tier 3' | 'No Incentive'
}

/**
 * Computes Regional Incentive Scores using the 40/30/20/10 weighted formula:
 *   - 40% Compliance       (based on cumulative expected vs paid, per church)
 *   - 30% Timeliness       (mocked — scaled from compliance until real timeliness data exists)
 *   - 20% Reporting        (mocked — scaled from compliance until real reporting data exists)
 *   - 10% Leadership       (mocked — scaled from compliance until real engagement data exists)
 *
 * Compliance uses `getExpectedUpToDate(church.created_at, now)` so that
 * year-end arrears carried forward from prior years correctly depress the
 * score — this is the whole point of the Unit 10.0 ledger upgrade.
 */
export async function getRegionalScores(): Promise<RegionalScoreData[]> {
  try {
    const regions = await prisma.region.findMany({
      include: {
        churches: {
          include: {
            // FIXED: Include allocations to properly calculate bucket isolation
            payments: { 
              where: { status: 'Paid' },
              include: { allocations: true }
            },
          },
        },
      },
    })

    // Capture "now" once so every church in every region is measured
    // against exactly the same instant (avoids micro-drift if the loop
    // crosses a minute/day boundary mid-iteration).
    const now = new Date()

    const scores = regions.map((region) => {
      let compliantChurches = 0
      const totalChurches = region.churches.length

      region.churches.forEach((church) => {
        let annualPaid = 0
        let monthlyPaid = 0

        // Read from allocations for strict bucket isolation
        church.payments.forEach((p) => {
          if (p.allocations.length === 0) {
            const amount = Number(p.amount_paid)
            if (p.payment_type === 'Annual') annualPaid += amount
            else monthlyPaid += amount
          } else {
            p.allocations.forEach((a) => {
              const amount = Number(a.amount)
              if (a.allocation_type === 'Annual') annualPaid += amount
              else monthlyPaid += amount
            })
          }
        })

        // Cumulative expected: from the church's created_at up to now.
        const { expectedAnnual, expectedMonthly } = getExpectedUpToDate(
          church.created_at,
          now
        )

        const annualStatus = getPeriodStatus(annualPaid, expectedAnnual)
        const monthlyStatus = getPeriodStatus(monthlyPaid, expectedMonthly)

        // FIXED: Strict Bucket Isolation. Church must be Paid in BOTH buckets.
        if (annualStatus === 'Paid' && monthlyStatus === 'Paid') {
          compliantChurches++
        }
      })

      const compliancePct = totalChurches > 0 ? (compliantChurches / totalChurches) * 100 : 0

      // Mocked sub-scores — scaled from compliance until real inputs exist.
      // These are intentionally simple so they don't skew the ranking; when
      // real timeliness/reporting/engagement data sources are wired up,
      // swap the mock formulas here.
      const timelinessPct = compliancePct > 0 ? 85 : 0
      const reportingAccuracy = compliancePct > 0 ? 90 : 0
      const leadershipEngagement = compliancePct > 0 ? 95 : 0

      // 40/30/20/10 weighted final score
      const finalScore =
        compliancePct * 0.4 +
        timelinessPct * 0.3 +
        reportingAccuracy * 0.2 +
        leadershipEngagement * 0.1

      let incentiveTier: RegionalScoreData['incentiveTier'] = 'No Incentive'
      if (finalScore >= 90) incentiveTier = 'Tier 1'
      else if (finalScore >= 75) incentiveTier = 'Tier 2'
      else if (finalScore >= 60) incentiveTier = 'Tier 3'

      return {
        regionId: region.id,
        regionName: region.name,
        compliancePct,
        timelinessPct,
        reportingAccuracy,
        leadershipEngagement,
        finalScore,
        incentiveTier,
      }
    })

    return scores.sort((a, b) => b.finalScore - a.finalScore)
  } catch (error) {
    console.error('Failed to calculate regional scores:', error)
    return []
  }
}