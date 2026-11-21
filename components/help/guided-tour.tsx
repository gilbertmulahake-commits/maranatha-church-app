// components/help/guided-tour.tsx

/**
 * Unit 20 — In-App Help & Onboarding.
 *
 * First-party guided tour — no react-joyride. Reads localStorage per-tier
 * (via useSyncExternalStore, matching the use-mobile.ts precedent) and
 * auto-launches once per tier. Re-launchable externally via the replaySignal
 * prop (wired from the drawer footer in Step 8b).
 *
 * Three patterns worth noting:
 *
 *  1. setState-in-effect avoided by deferring DOM reads to requestAnimationFrame
 *     (async callback, not sync effect body — satisfies react-hooks/set-state-in-effect).
 *  2. Position state carries `forStep`; render gates on `forStep === stepIndex`
 *     so a stale position from the previous step never flashes.
 *  3. True Spotlight: a transparent target-shaped div with a massive boxShadow
 *     cuts a visual hole out of the overlay. A separate invisible click-blocker
 *     prevents users from interacting with the dimmed background.
 *  4. Bulletproof Focus Trap: listens to `keydown` and `focusin` on the document
 *     in the capture phase. If focus tries to escape to the URL bar, the background,
 *     or the sidebar, it is instantly forced back into the tour card.
 */

'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { usePathname } from 'next/navigation'
import type { Role } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { toReportRole } from '@/lib/auth/roles'
import {
  HELP_TOUR_STORAGE_KEY_PREFIX,
  HELP_TOUR_VERSION,
} from '@/lib/help/constants'
import { TOUR_STEPS, type TourStepPlacement } from '@/lib/help/tour-steps'

// ---- External store: per-tier "seen" flag ----

const listenersByKey = new Map<string, Set<() => void>>()

function subscribe(key: string, cb: () => void): () => void {
  let set = listenersByKey.get(key)
  if (!set) {
    set = new Set()
    listenersByKey.set(key, set)
  }
  set.add(cb)
  return () => {
    set?.delete(cb)
  }
}

function getSeen(key: string): boolean {
  if (typeof window === 'undefined') return true
  return window.localStorage.getItem(key) === HELP_TOUR_VERSION
}

function markSeen(key: string): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, HELP_TOUR_VERSION)
  listenersByKey.get(key)?.forEach((cb) => cb())
}

// ---- Position ----

type PositionState =
  | { kind: 'pending' }
  | { kind: 'centered'; forStep: number }
  | { kind: 'targeted'; forStep: number; top: number; left: number; rect: DOMRect }

const CARD_W = 320
const CARD_H_APPROX = 220
const GAP = 12

function computePosition(
  rect: DOMRect,
  placement: TourStepPlacement | undefined
): { top: number; left: number } {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const place = placement ?? 'bottom'

  let top = rect.bottom + GAP
  let left = Math.max(GAP, Math.min(rect.left, vw - CARD_W - GAP))

  if (place === 'top') {
    top = Math.max(GAP, rect.top - CARD_H_APPROX - GAP)
  } else if (place === 'left') {
    const leftCandidate = rect.left - CARD_W - GAP
    if (leftCandidate >= GAP) {
      left = leftCandidate
      top = Math.max(GAP, Math.min(rect.top, vh - CARD_H_APPROX - GAP))
    }
  } else if (place === 'right') {
    const leftCandidate = rect.right + GAP
    if (leftCandidate + CARD_W <= vw - GAP) {
      left = leftCandidate
      top = Math.max(GAP, Math.min(rect.top, vh - CARD_H_APPROX - GAP))
    }
  }

  if (top + CARD_H_APPROX > vh - GAP) {
    top = Math.max(GAP, vh - CARD_H_APPROX - GAP)
  }

  return { top, left }
}

// ---- Component ----

interface GuidedTourProps {
  role: Role | string | null | undefined
  /** Bumped externally to re-launch the tour. Default 0 = no external trigger. */
  replaySignal?: number
}

export function GuidedTour({ role, replaySignal = 0 }: GuidedTourProps) {
  const tier = toReportRole(role)
  const storageKey = HELP_TOUR_STORAGE_KEY_PREFIX + tier
  const steps = TOUR_STEPS[tier]

  const subscribeFn = useCallback(
    (cb: () => void) => subscribe(storageKey, cb),
    [storageKey]
  )
  const getSnapshot = useCallback(() => getSeen(storageKey), [storageKey])
  const seen = useSyncExternalStore(subscribeFn, getSnapshot, () => true)

  const [manualReplay, setManualReplay] = useState(false)
  const [lastSignal, setLastSignal] = useState(replaySignal)
  const [stepIndex, setStepIndex] = useState(0)
  const [position, setPosition] = useState<PositionState>(() => {
    const first = steps[0]
    return first && !first.target ? { kind: 'centered', forStep: 0 } : { kind: 'pending' }
  })

  const cardRef = useRef<HTMLDivElement | null>(null)
  const lastFocusedRef = useRef<Element | null>(null)

  // Derived-state pattern: respond to external replay signal.
  if (lastSignal !== replaySignal) {
    setLastSignal(replaySignal)
    if (replaySignal > 0) {
      setManualReplay(true)
      setStepIndex(0)
    }
  }

  const pathname = usePathname()
  const autoRun = pathname === '/dashboard' && !seen
  const run = autoRun || manualReplay
  const currentStep = steps[stepIndex]

  const close = useCallback(() => {
    markSeen(storageKey)
    setManualReplay(false)
    setStepIndex(0)
  }, [storageKey])

  const next = useCallback(() => {
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1)
    } else {
      close()
    }
  }, [stepIndex, steps.length, close])

  const back = useCallback(() => {
    if (stepIndex > 0) setStepIndex(stepIndex - 1)
  }, [stepIndex])

  // Compute position on step change.
  useEffect(() => {
    if (!run || !currentStep) return
    const stepIdx = stepIndex
    const id = requestAnimationFrame(() => {
      if (!currentStep.target) {
        setPosition({ kind: 'centered', forStep: stepIdx })
        return
      }
      
      // Mobile Best Practice: target hamburger trigger instead of hidden sidebar
      let resolvedTarget = currentStep.target
      if (resolvedTarget === '[data-slot="sidebar-content"]' && window.innerWidth < 768) {
        resolvedTarget = '[data-sidebar="trigger"]'
      }

      const el = document.querySelector(resolvedTarget)
      if (!(el instanceof HTMLElement)) {
        setPosition({ kind: 'centered', forStep: stepIdx })
        return
      }
      const rect = el.getBoundingClientRect()
      const { top, left } = computePosition(rect, currentStep.placement)
      setPosition({ kind: 'targeted', forStep: stepIdx, top, left, rect })
    })
    return () => cancelAnimationFrame(id)
  }, [run, stepIndex, currentStep])

  // Focus trap + refocus on step change.
  useEffect(() => {
    if (!run) return
    const el = cardRef.current
    if (!el) return

    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

    // Initial focus when the step changes (only if focus isn't already in the card)
    if (!el.contains(document.activeElement)) {
      const initialFocusable = el.querySelectorAll<HTMLElement>(focusableSelector)
      initialFocusable[0]?.focus()
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      const focusable = el.querySelectorAll<HTMLElement>(focusableSelector)
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      // If focus escaped the card, force it to the first element
      if (!el.contains(document.activeElement)) {
        e.preventDefault()
        first.focus()
        return
      }

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    // Fires whenever focus changes anywhere on the page
    const handleFocusIn = (e: FocusEvent) => {
      if (!el.contains(e.target as Node)) {
        e.stopPropagation()
        const first = el.querySelector<HTMLElement>(focusableSelector)
        first?.focus()
      }
    }

    // Use capture phase (true) to intercept before the browser or React handles it
    document.addEventListener('keydown', handleKeyDown, true)
    document.addEventListener('focusin', handleFocusIn, true)

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      document.removeEventListener('focusin', handleFocusIn, true)
    }
  }, [run, stepIndex])

  // Save/restore focus around the tour lifetime.
  useEffect(() => {
    if (!run) return
    if (!lastFocusedRef.current) {
      lastFocusedRef.current = document.activeElement
    }
    return () => {
      if (lastFocusedRef.current instanceof HTMLElement) {
        lastFocusedRef.current.focus()
      }
      lastFocusedRef.current = null
    }
  }, [run])

  // Escape dismisses.
  useEffect(() => {
    if (!run) return
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [run, close])

  if (!run) return null
  if (!currentStep) return null

  const pos =
    position.kind !== 'pending' && position.forStep === stepIndex ? position : null
  if (pos === null) return null

  const isCentered = pos.kind === 'centered'

  return (
    <>
      {/* If centered, render a standard full-screen overlay. */}
      {pos.kind === 'centered' && (
        <div className="fixed inset-0 z-[100] bg-black/60 transition-opacity duration-300" aria-hidden />
      )}

      {/* If targeted, use a transparent box with a massive box-shadow to create a true cut-out spotlight. */}
      {pos.kind === 'targeted' && (
        <>
          <div
            aria-hidden
            className="pointer-events-none fixed z-[100] rounded-md transition-all duration-300"
            style={{
              top: pos.rect.top,
              left: pos.rect.left,
              width: pos.rect.width,
              height: pos.rect.height,
              // Chain the green ring and the dark cut-out shadow together.
              boxShadow: '0 0 0 4px var(--color-emerald-500), 0 0 0 9999px rgba(0, 0, 0, 0.6)',
            }}
          />
          {/* Invisible click-blocker to stop interactions with the background (no stop icon). */}
          <div className="fixed inset-0 z-[100]" aria-hidden />
        </>
      )}

      <div
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        className="fixed z-[101] w-[320px] max-w-[calc(100vw-24px)] rounded-xl border border-border bg-card p-4 shadow-2xl focus:outline-none"
        style={
          isCentered
            ? { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
            : pos.kind === 'targeted'
              ? { top: pos.top, left: pos.left }
              : undefined
        }
      >
        <h3
          id="tour-title"
          className="text-heading-4 font-bold tracking-tight text-foreground"
        >
          {currentStep.title}
        </h3>
        <p
          aria-live="polite"
          className="mt-2 text-paragraph-small text-foreground"
        >
          {currentStep.body}
        </p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="text-paragraph-small text-muted-foreground">
            Step {stepIndex + 1} of {steps.length}
          </span>
          <div className="flex gap-2">
            {stepIndex > 0 && (
              <Button variant="outline" size="sm" onClick={back}>
                Back
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={close}>
              Skip
            </Button>
            <Button size="sm" onClick={next}>
              {stepIndex === steps.length - 1 ? 'Done' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}