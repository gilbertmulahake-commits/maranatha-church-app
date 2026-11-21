// components/shared/entity-back-button.tsx

/**
 * Unit 20.5 — Navigation Parity & Cross-Linking.
 *
 * Shared back button for entity detail pages (region, church). Uses
 * browser history when available so the Back button returns the user to
 * wherever they came from — e.g. `/dashboard` when opened from a leaderboard
 * row, `/dashboard/regions` when opened from the regions list. Falls back to
 * the entity's list page on a fresh tab / direct visit where history is
 * unavailable.
 *
 * Server Components cannot call `useRouter()`, so this is a small client
 * component consumed by `app/dashboard/regions/[slug]/page.tsx` and
 * `app/dashboard/churches/[code]/page.tsx`.
 *
 * Icon-only to match the existing visual; `aria-label` added because the
 * current markup has no accessible name.
 */

'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

interface EntityBackButtonProps {
  /** Where to go if there is no browser history (fresh tab / direct visit). */
  fallbackHref: string
}

export function EntityBackButton({ fallbackHref }: EntityBackButtonProps) {
  const router = useRouter()
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      aria-label="Go back"
      onClick={() => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
          router.back()
        } else {
          router.push(fallbackHref)
        }
      }}
    >
      <ArrowLeft className="h-4 w-4" />
    </Button>
  )
}