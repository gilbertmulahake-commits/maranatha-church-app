// components/help/help-trigger.tsx

/**
 * Unit 20 — In-App Help & Onboarding.
 *
 * Header "?" button — opens the Help drawer. Must be rendered inside
 * <HelpDrawerProvider> (useHelpDrawer throws otherwise), which is why
 * app/dashboard/layout.tsx mounts the provider before site-header.tsx
 * mounts this trigger.
 *
 * `data-tour` prop is forwarded onto the underlying <button> so the guided
 * tour's step 4 can target `[data-tour="help-trigger"]` without DOM hacks.
 *
 * Spec clarification: no `variant` prop. § Entry points specifies the sidebar
 * Help entry is a plain <Link> to /dashboard/help, not an interactive trigger —
 * so a "sidebar" variant would have no consumer. Header-only.
 */

'use client'

import { HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useHelpDrawer } from './help-drawer-provider'

interface HelpTriggerProps {
  'data-tour'?: string
}

export function HelpTrigger({ 'data-tour': dataTour }: HelpTriggerProps) {
  const { openDrawer } = useHelpDrawer()

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      aria-label="Open help"
      onClick={openDrawer}
      data-tour={dataTour}
    >
      <HelpCircle className="h-4 w-4" />
    </Button>
  )
}