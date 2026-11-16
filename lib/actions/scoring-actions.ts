'use server'

import { prisma } from '@/lib/prisma'
import {
  getExpectedUpToDate,
  getPeriodStatus,
  sumApprovedWriteOffs,
} from '@/lib/utils/financial'

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
      let activeChurchesCount = 0

      region.churches.forEach((church) => {
        // Skip defunct churches entirely — not counted in denominator, not counted in arrears
        if (church.is_defunct) return

        activeChurchesCount++

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

        // Net outstanding = gross - written off
        const writtenOff = sumApprovedWriteOffs(church.write_offs)
        let grossAnnual = Math.max(0, expectedAnnual - annualPaid)
        let grossMonthly = Math.max(0, expectedMonthly - monthlyPaid)

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

        const annualStatus = getPeriodStatus(annualPaid, expectedAnnual)
        const monthlyStatus = getPeriodStatus(monthlyPaid, expectedMonthly)

        if (annualStatus === 'Paid' && monthlyStatus === 'Paid') {
          compliantChurches++
        }
      })

      const compliancePct =
        activeChurchesCount > 0
          ? (compliantChurches / activeChurchesCount) * 100
          : 0
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