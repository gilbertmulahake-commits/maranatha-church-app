'use server'

import { prisma } from '@/lib/prisma'
import { getExpectedToDate, getChurchStatus } from '@/lib/utils/financial'

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

export async function getRegionalScores(): Promise<RegionalScoreData[]> {
  try {
    const regions = await prisma.region.findMany({
      include: {
        churches: {
          include: {
            payments: true,
          },
        },
      },
    })

    const { totalExpected: expectedToDate } = getExpectedToDate()

    const scores = regions.map((region) => {
      let compliantChurches = 0
      const totalChurches = region.churches.length

      region.churches.forEach((church) => {
        const totalPaid = church.payments.reduce((sum, p) => sum + Number(p.amount_paid), 0)
        if (getChurchStatus(totalPaid, expectedToDate) === 'Paid') {
          compliantChurches++
        }
      })

      // 1. Compliance (Real data)
      const compliancePct = totalChurches > 0 ? (compliantChurches / totalChurches) * 100 : 0

      // 2-4. Mock the administrative metrics based on compliance for now
      // (In production, these will be tied to actual report submissions and meeting attendance)
      const timelinessPct = compliancePct > 0 ? 85 : 0 
      const reportingAccuracy = compliancePct > 0 ? 90 : 0
      const leadershipEngagement = compliancePct > 0 ? 95 : 0

      // --- Apply the Formula: (Compliance * 0.4) + (Timeliness * 0.3) + (Reporting * 0.2) + (Engagement * 0.1) ---
      const finalScore = 
        (compliancePct * 0.4) + 
        (timelinessPct * 0.3) + 
        (reportingAccuracy * 0.2) + 
        (leadershipEngagement * 0.1)

      // --- Determine Tier ---
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

    // Sort descending by final score
    return scores.sort((a, b) => b.finalScore - a.finalScore)

  } catch (error) {
    console.error('Failed to calculate regional scores:', error)
    return []
  }
}