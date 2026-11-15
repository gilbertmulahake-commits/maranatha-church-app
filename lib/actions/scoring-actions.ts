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
  outstandingAmount: number
  outstandingAnnual: number
  outstandingMonthly: number
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
 *
 * Also returns `outstandingAmount` per region (gross arrears, strict bucket isolation)
 * so the Leaderboard can display arrears alongside compliance.
 */
export async function getRegionalScores(): Promise<RegionalScoreData[]> {
  try {
    const regions = await prisma.region.findMany({
      include: {
        churches: {
          include: {
            payments: { 
              where: { status: 'Paid' },
              include: { allocations: true }
            },
          },
        },
      },
    })

    const now = new Date()

    const scores = regions.map((region) => {
      let compliantChurches = 0
      let outstandingAnnual = 0
      let outstandingMonthly = 0
      const totalChurches = region.churches.length

      region.churches.forEach((church) => {
        let annualPaid = 0
        let monthlyPaid = 0

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

        const { expectedAnnual, expectedMonthly } = getExpectedUpToDate(
          church.created_at,
          now
        )

        // Gross arrears per bucket — Strict Bucket Isolation
        outstandingAnnual += Math.max(0, expectedAnnual - annualPaid)
        outstandingMonthly += Math.max(0, expectedMonthly - monthlyPaid)

        const annualStatus = getPeriodStatus(annualPaid, expectedAnnual)
        const monthlyStatus = getPeriodStatus(monthlyPaid, expectedMonthly)

        if (annualStatus === 'Paid' && monthlyStatus === 'Paid') {
          compliantChurches++
        }
      })

      const compliancePct = totalChurches > 0 ? (compliantChurches / totalChurches) * 100 : 0
      const outstandingAmount = outstandingAnnual + outstandingMonthly

      const timelinessPct = compliancePct > 0 ? 85 : 0
      const reportingAccuracy = compliancePct > 0 ? 90 : 0
      const leadershipEngagement = compliancePct > 0 ? 95 : 0

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
        outstandingAmount,
        outstandingAnnual,
        outstandingMonthly,
      }
    })

    return scores.sort((a, b) => b.finalScore - a.finalScore)
  } catch (error) {
    console.error('Failed to calculate regional scores:', error)
    return []
  }
}