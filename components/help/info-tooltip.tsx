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
 * Bubble guard: the tooltip button sits inside a <Link> on the Compliance
 * Snapshot KPI card. Base UI's TooltipTrigger.render intercepts the button's
 * onClick (it composes its own handlers on the cloned element), so an onClick
 * attached directly to the button did not reliably stop navigation. The guard
 * lives on a wrapping <span> instead: during click-bubble, the span handler
 * runs after Base UI's handlers and before the <a>'s, calls
 * preventDefault() (stops anchor navigation) and stopPropagation() (stops
 * further bubbling). Deterministic regardless of Base UI's internals.
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
  const blockBubble = (e: React.MouseEvent<HTMLSpanElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  return (
    <span onClick={blockBubble} className="inline-flex">
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
    </span>
  )
}