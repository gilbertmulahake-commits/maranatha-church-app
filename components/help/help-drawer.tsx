// components/help/help-drawer.tsx

'use client'

import Link from 'next/link'
import type { Role } from '@prisma/client'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { toReportRole } from '@/lib/auth/roles'
import { HelpContent } from './help-content'

const TIER_LABEL = {
  NATIONAL: 'National HQ',
  REGIONAL: 'Regional',
  LOCAL: 'Local Church',
} as const

interface HelpDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: Role | string | null | undefined
  onReplayTour?: () => void
}

export function HelpDrawer({
  open,
  onOpenChange,
  role,
  onReplayTour,
}: HelpDrawerProps) {
  const tier = toReportRole(role)
  const tierLabel = TIER_LABEL[tier]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* 
        THE HACK: Using inline styles for the critical layout properties. 
        Inline styles have absolute priority over Tailwind classes and `twMerge` conflicts.
        We force width, height, background, and flex layout so the primitive cannot collapse.
      */}
      <SheetContent
        side="right"
        className="border-l border-border p-0"
        style={{
          width: '100%',
          maxWidth: '400px',
          height: '100dvh',
          backgroundColor: 'var(--background)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <SheetHeader className="p-6 pb-4 shrink-0 pr-12">
          <SheetTitle>Help</SheetTitle>
          <SheetDescription>{tierLabel} — quick reference</SheetDescription>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4" style={{ minHeight: 0 }}>
          <HelpContent variant="drawer" role={role} />
        </div>
        
        <SheetFooter className="shrink-0 flex-row items-center justify-between border-t border-border p-6 pt-4">
          {onReplayTour ? (
            <Button variant="outline" size="sm" onClick={onReplayTour}>
              Replay tour
            </Button>
          ) : (
            <span aria-hidden />
          )}
          <Link
            href="/dashboard/help#reading-the-reports"
            className="text-paragraph-small text-primary hover:underline transition-colors"
            onClick={() => onOpenChange(false)}
          >
            View full help →
          </Link>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}