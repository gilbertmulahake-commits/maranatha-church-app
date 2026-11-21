// lib/help/tour-steps.ts

/**
 * Unit 20 — In-App Help & Onboarding.
 *
 * First-party guided tour step definitions, keyed by tier.
 *
 * Data only — no logic, no side effects, no imports that resolve at runtime.
 * `HelpTier` comes from `./content` via `import type` so it is erased at
 * compile time. The tour runner (`components/help/guided-tour.tsx`) consumes
 * `TOUR_STEPS[tier]` and nothing else.
 *
 * Targets reference DOM selectors that already exist, plus two `data-tour`
 * attributes added in this unit:
 *   - `[data-slot="sidebar-content"]` — already present in components/ui/sidebar.tsx (untouched)
 *   - `[data-tour="main-content"]`   — added in app/dashboard/layout.tsx
 *   - `[data-tour="help-trigger"]`   — added in components/layout/site-header.tsx
 */

import type { HelpTier } from './content'

export type TourStepPlacement = 'top' | 'bottom' | 'left' | 'right'

export interface TourStep {
  /** CSS selector, or null for a centered card with no target. */
  target: string | null
  title: string
  body: string
  placement?: TourStepPlacement
}

/**
 * Five steps per tier. No more — industry best practice is 3–5.
 *
 * Order is fixed:
 *   1. Welcome       (centered, no target)
 *   2. Sidebar       (navigation)
 *   3. Main content  (the dashboard surface for this tier)
 *   4. Help trigger  (where help lives, including the `?` shortcut)
 *   5. Done          (centered, no target)
 */
export const TOUR_STEPS: Record<HelpTier, TourStep[]> = {
  NATIONAL: [
    {
      target: null,
      title: 'Welcome to the national command center',
      body:
        'This short tour shows where your tools live. Skip at any time — you can replay it from the Help drawer.',
    },
    {
      target: '[data-slot="sidebar-content"]',
      title: 'Your navigation',
      body:
        'Dashboard, Payments, Reconciliation, Reports, Audit Logs, Users. Which items you see depends on your role — Finance Admin and Operations Admin see different slices of this list.',
      placement: 'right',
    },
    {
      target: '[data-tour="main-content"]',
      title: 'Executive Command Center',
      body:
        'Four tiers: schedule adherence and action center, bucket health for Annual and Monthly, analytics, and accountability. The timeframe toggle at the top drives the hero card, KPIs, and chart together.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="help-trigger"]',
      title: 'Help is one click away',
      body:
        'Click the ? icon anytime — or press Shift+/ — to open the Help drawer. The full reference lives at /dashboard/help.',
      placement: 'bottom',
    },
    {
      target: null,
      title: 'You are set',
      body:
        'That is the tour. Replay it from the Help drawer footer whenever you need a refresher.',
    },
  ],
  REGIONAL: [
    {
      target: null,
      title: 'Welcome to your regional view',
      body:
        'This short tour shows where your tools live. Skip at any time — you can replay it from the Help drawer.',
    },
    {
      target: '[data-slot="sidebar-content"]',
      title: 'Your navigation',
      body:
        'Your Regional Dashboard, Regional Payments, and Reports. Everything you see is scoped to your region.',
      placement: 'right',
    },
    {
      target: '[data-tour="main-content"]',
      title: 'Your region at a glance',
      body:
        'Your churches, compliance, collections, and arrears for the current period. Annual and Monthly are tracked independently — never combined.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="help-trigger"]',
      title: 'Help is one click away',
      body:
        'Click the ? icon anytime — or press Shift+/ — to open the Help drawer. The full reference lives at /dashboard/help.',
      placement: 'bottom',
    },
    {
      target: null,
      title: 'You are set',
      body:
        'That is the tour. Replay it from the Help drawer footer whenever you need a refresher.',
    },
  ],
  LOCAL: [
    {
      target: null,
      title: 'Welcome to your church dashboard',
      body:
        'This short tour shows where your tools live. Skip at any time — you can replay it from the Help drawer.',
    },
    {
      target: '[data-slot="sidebar-content"]',
      title: 'Your navigation',
      body:
        'Your Church Dashboard and Payment History. Everything you see belongs to your church.',
      placement: 'right',
    },
    {
      target: '[data-tour="main-content"]',
      title: 'Your church, your numbers',
      body:
        'Annual and Monthly obligations tracked independently. The status badge and KPIs swap when you switch buckets. The Pay Now button opens the guided payment wizard.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="help-trigger"]',
      title: 'Help is one click away',
      body:
        'Click the ? icon anytime — or press Shift+/ — to open the Help drawer. The full reference lives at /dashboard/help.',
      placement: 'bottom',
    },
    {
      target: null,
      title: 'You are set',
      body:
        'That is the tour. Replay it from the Help drawer footer whenever you need a refresher.',
    },
  ],
}