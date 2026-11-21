// components/help/info-tooltip.tsx

/**
 * Unit 20 — In-App Help & Onboarding.
 *
 * Thin wrapper over the protected `components/ui/tooltip.tsx` primitive for
 * inline contextual help. Consumes the primitive as-is — the primitive is
 * NOT modified.
 *
 * Renders a real <button> as the trigger (not a <span>): real focus target,
 * real keyboard activation, real aria-label. Tooltip.Root > Tooltip.Trigger
 * is enforced by the wrapper so no consumer can break the Base UI rule.
 *
 * Copy comes from `lib/help/content.ts` → INFO_TOOLTIPS, so the same
 * sentence is never duplicated across surfaces.
 */

'use client'

import { Info } from 'lucide-react'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'

interface InfoTooltipProps {
  /** Human-readable label for the aria-label, e.g. "Compliance Snapshot". */
  label: string
  /** The tooltip body. Sourced from INFO_TOOLTIPS in lib/help/content.ts. */
  content: string
}

export function InfoTooltip({ label, content }: InfoTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={`About ${label}`}
            className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        }
      />
      <TooltipContent>{content}</TooltipContent>
    </Tooltip>
  )
}