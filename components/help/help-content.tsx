// components/help/help-content.tsx

/**
 * Unit 20 — In-App Help & Onboarding.
 *
 * Shared renderer for the Help page (`variant="page"`) and Help drawer
 * (`variant="drawer"`). Drawer renders the current tier only. Page renders
 * all three tiers, current tier first, so a National user lands on National
 * help before seeing what Regional and Local users see.
 *
 * "Reading the reports" is the first section inside each tier (sourced from
 * content.ts). The first occurrence on the page carries `id="reading-the-reports"`
 * so the drawer's "View full help →" link lands on it directly.
 */

'use client'

import type { Role } from '@prisma/client'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { toReportRole } from '@/lib/auth/roles'
import {
  getHelpContent,
  getHelpContentByTier,
  type HelpSection,
  type HelpTier,
} from '@/lib/help/content'

const TIER_LABEL: Record<HelpTier, string> = {
  NATIONAL: 'National HQ',
  REGIONAL: 'Regional',
  LOCAL: 'Local Church',
}

const TIER_ORDER: HelpTier[] = ['NATIONAL', 'REGIONAL', 'LOCAL']

interface HelpContentProps {
  variant: 'page' | 'drawer'
  role: Role | string | null | undefined
}

export function HelpContent({ variant, role }: HelpContentProps) {
  const currentTier: HelpTier = toReportRole(role)

  if (variant === 'drawer') {
    const sections = getHelpContent(role)
    return (
      <div className="space-y-4">
        {sections.map((section) => (
          <SectionCard key={section.id} section={section} />
        ))}
      </div>
    )
  }

  // Page: all three tiers, current first.
  const orderedTiers: HelpTier[] = [
    currentTier,
    ...TIER_ORDER.filter((t) => t !== currentTier),
  ]

  return (
    <div className="space-y-xl">
      {orderedTiers.map((tier, tierIndex) => {
        const sections = getHelpContentByTier(tier)
        return (
          <div key={tier} className="space-y-4">
            <h2 className="text-heading-3 font-bold tracking-tight text-foreground">
              {TIER_LABEL[tier]}
            </h2>
            {sections.map((section) => {
              const isFirstReadingTheReports =
                tierIndex === 0 && section.id === 'reading-the-reports'
              return (
                <SectionCard
                  key={`${tier}-${section.id}`}
                  section={section}
                  anchorId={
                    isFirstReadingTheReports ? 'reading-the-reports' : undefined
                  }
                />
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

interface SectionCardProps {
  section: HelpSection
  /** Optional id used for in-page anchor links. */
  anchorId?: string
}

function SectionCard({ section, anchorId }: SectionCardProps) {
  return (
    <Card id={anchorId} className="scroll-mt-20">
      <CardHeader>
        <CardTitle className="text-heading-4 font-bold tracking-tight">
          {section.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {section.entries.map((entry) => (
          <div key={entry.title} className="space-y-1">
            <p className="text-paragraph-small font-medium text-foreground">
              {entry.title}
            </p>
            <p className="text-paragraph-small text-foreground">
              {entry.body}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}