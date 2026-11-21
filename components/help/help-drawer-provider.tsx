// components/help/help-drawer-provider.tsx

/**
 * Unit 20 — In-App Help & Onboarding.
 *
 * Context provider that owns Help drawer open state, the global `?`
 * keyboard shortcut, and the guided-tour replay signal. Mounted once in
 * `app/dashboard/layout.tsx` inside the authenticated tree, wrapping
 * `<SidebarProvider>`.
 *
 * GuidedTour is mounted here (not directly in layout.tsx) because layout.tsx
 * is a server component — refs/imperative handles cannot cross the server→client
 * boundary. Owning both the drawer and the tour inside this client provider
 * means the replay wiring is entirely client-side. Spec deviation logged in
 * progress-tracker.md at unit close.
 *
 * `?` opens (one-way). Once open, the drawer itself renders a `[role="dialog"]`,
 * so `?` is correctly suppressed while any modal is open. Escape closes.
 * Route-change close uses React's "adjust state during render" pattern
 * (not a setState-in-effect, per react-hooks/set-state-in-effect).
 */

'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { usePathname } from 'next/navigation'
import type { Role } from '@prisma/client'
import { HelpDrawer } from './help-drawer'
import { GuidedTour } from './guided-tour'

interface HelpDrawerContextValue {
  open: boolean
  openDrawer: () => void
  closeDrawer: () => void
}

const HelpDrawerContext = createContext<HelpDrawerContextValue | null>(null)

export function useHelpDrawer(): HelpDrawerContextValue {
  const ctx = useContext(HelpDrawerContext)
  if (!ctx) {
    throw new Error('useHelpDrawer must be used inside <HelpDrawerProvider>')
  }
  return ctx
}

function isTypingTarget(el: Element | null): boolean {
  if (!el) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return true
  if ((el as HTMLElement).isContentEditable) return true
  return false
}

interface HelpDrawerProviderProps {
  role: Role | string | null | undefined
  children: React.ReactNode
}

export function HelpDrawerProvider({
  role,
  children,
}: HelpDrawerProviderProps) {
  const [open, setOpen] = useState(false)
  const [replaySignal, setReplaySignal] = useState(0)
  const pathname = usePathname()

  const [lastPathname, setLastPathname] = useState(pathname)
  if (lastPathname !== pathname) {
    setLastPathname(pathname)
    setOpen(false)
  }

  const openDrawer = useCallback(() => setOpen(true), [])
  const closeDrawer = useCallback(() => setOpen(false), [])

  // Close the drawer (so the tour's z-[100] overlay is unobstructed) and
  // bump the replay signal. GuidedTour observes the signal and re-runs.
  const replayTour = useCallback(() => {
    setOpen(false)
    setReplaySignal((s) => s + 1)
  }, [])

  // Global `?` shortcut. One-way open — see file header comment.
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const isQuestionMark = e.key === '?' || (e.key === '/' && e.shiftKey)
      if (!isQuestionMark) return
      if (isTypingTarget(document.activeElement)) return
      if (document.querySelector('[role="dialog"]')) return
      e.preventDefault()
      setOpen(true)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <HelpDrawerContext.Provider value={{ open, openDrawer, closeDrawer }}>
      {children}
      <HelpDrawer
        open={open}
        onOpenChange={setOpen}
        role={role}
        onReplayTour={replayTour}
      />
      <GuidedTour role={role} replaySignal={replaySignal} />
    </HelpDrawerContext.Provider>
  )
}