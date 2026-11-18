'use server'

import { prisma } from '@/lib/prisma'
import { isChurchCompliant, sumApprovedWriteOffs } from '@/lib/utils/financial'

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
  // Unit 18.2 additions — Gross / Less Written Off / Net for the report
  grossOutstandingAnnual: number
  grossOutstandingMonthly: number
  totalWrittenOff: number
}

export async function getRegionalScores(): Promise<RegionalScoreData[]> {
  try {
    const regions = await prisma.region.findMany({
      include: {
        churches: {
          include: {
            payments: {
              where: { status: 'Paid' },
              include: { allocations: true },
            },
            write_offs: {
              where: { status: 'Approved' },
              select: { amount: true, status: true },
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
      let grossOutstandingAnnual = 0
      let grossOutstandingMonthly = 0
      let activeChurchesCount = 0

      region.churches.forEach((church) => {
        if (church.is_defunct) return
        activeChurchesCount++

        // Single source of truth for compliance + paid/expected figures
        const c = isChurchCompliant(church, now)
        if (c.compliant) compliantChurches++

        let grossAnnual = Math.max(0, c.expectedAnnual - c.annualPaid)
        let grossMonthly = Math.max(0, c.expectedMonthly - c.monthlyPaid)

        // Accumulate gross BEFORE write-off deduction
        grossOutstandingAnnual += grossAnnual
        grossOutstandingMonthly += grossMonthly

        // Deduct write-offs LIFO (annual first) to compute net
        const writtenOff = sumApprovedWriteOffs(church.write_offs)
        let remainingWriteOff = writtenOff
        if (remainingWriteOff > 0) {
          const deductAnnual = Math.min(grossAnnual, remainingWriteOff)
          grossAnnual -= deductAnnual
          remainingWriteOff -= deductAnnual
        }
        if (remainingWriteOff > 0) {
          const deductMonthly = Math.min(grossMonthly, remainingWriteOff)
          grossMonthly -= deductMonthly
          remainingWriteOff -= deductMonthly
        }

        outstandingAnnual += grossAnnual
        outstandingMonthly += grossMonthly
      })

      const compliancePct =
        activeChurchesCount > 0
          ? (compliantChurches / activeChurchesCount) * 100
          : 0
      const outstandingAmount = outstandingAnnual + outstandingMonthly
      const totalWrittenOff =
        grossOutstandingAnnual + grossOutstandingMonthly - outstandingAmount

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
        grossOutstandingAnnual,
        grossOutstandingMonthly,
        totalWrittenOff,
      }
    })

    return scores.sort((a, b) => b.finalScore - a.finalScore)
  } catch (error) {
    console.error('Failed to calculate regional scores:', error)
    return []
  }
}