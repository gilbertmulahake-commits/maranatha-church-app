# Unit 20: In-App Help & Onboarding

## Goal

Deliver a role-aware in-app help system with five surfaces — a `/dashboard/help`
page, a right-side Help drawer, a first-visit guided tour on `/dashboard`, a `?`
keyboard shortcut, and inline `<InfoTooltip>` contextual help on three named
surfaces — with zero schema changes, zero new server actions, zero new RBAC guards,
and no modification to any protected file. **Reports & analytics interpretation is
the first section of the help content for every tier**, because analytics are the
least self-explanatory surface in the app and help has to be reachable before a
user opens their first chart.

## Design

### Reports & Analytics first

Reports are seen by all three tiers, and analytics are the least self-explanatory
surface in the app. Therefore:

- **"Reading the reports" is the first section** on `/dashboard/help` and in the
  Help drawer, for every tier. Anchor: `#reading-the-reports`.
- That section covers, in `text-paragraph-small` body text:
  - Role-scoping — the user sees only the reports their tier can access.
  - **Cash basis vs obligation basis** — YoY counts cash by `payment_date`
    calendar year, not `billing_year` attribution (per `architecture.md` § 18.2
    "YoY Basis").
  - **Gross vs Net of write-offs** — write-offs are disclosed on their own line,
    never silently netted (per `architecture.md` § 7).
  - **Strict Bucket Isolation** — Annual and Monthly are independent ledgers,
    never combined.
  - One line per report slug, **sourced from `report-registry.ts` descriptions**
    — not re-authored in `lib/help/content.ts`. If the registry description
    changes, the help page follows.
- Per-report "watch for" notes (e.g., the Allocation Breakdown Discrepancy column)
  are **deferred** to a follow-up unit that adds an `interpretationNote` field to
  `report-registry.ts`. Unit 20 does not edit the registry.

### Information architecture

- Three tiers (National / Regional / Local), resolved via `toReportRole(role)` from
  `lib/auth/roles.ts`. No parallel role mapping.
- **Drawer** renders the current user's tier only. **Page** renders all three tiers,
  current tier first. The drawer carries a persistent "View full help →" link to
  the page so users can escape to the deep reference.
- Content is grouped into `<Card>` sections per tier (`bg-card rounded-xl border
  border-border shadow-sm`). Section titles use `text-heading-4 font-bold
  tracking-tight`. Entry titles use `text-paragraph-small font-medium
  text-foreground`. Entry bodies use `text-paragraph-small text-foreground`.
- "Reading the reports" is the first `<Card>` in every tier.
- Conditional National-tier entries use existing helpers (`isFinanceAdmin`,
  `isOperationsAdmin`, explicit `NATIONAL_TREASURER` / `NATIONAL_OVERSEER` checks)
  — never raw role strings inside copy files. Help copy cannot drift from real
  access because it reads the same predicates the sidebar reads.

### Entry points (five surfaces, each with one job)

1. **Header** — `<SiteHeader>` gains a right-aligned slot (`ml-auto`) containing a
   single `<HelpTrigger variant="header" />` (ghost icon button `h-8 w-8`, Lucide
   `HelpCircle`, matching `site-header.tsx`'s existing Lucide usage). Carries
   `data-tour="help-trigger"`. `<SidebarTrigger>` and breadcrumb `<nav>` untouched.
2. **Sidebar** — `app-sidebar.tsx` `navSecondary` gains one entry
   `{ title: 'Help', url: '/dashboard/help', icon: IconHelp }` (Tabler `IconHelp`,
   matching that file's existing Tabler convention). No new role gate —
   `navSecondary` is already role-independent.
3. **Keyboard** — a single global listener in `HelpDrawerProvider` opens the drawer
   on `?` (Shift+/), suppressed while an `<input>`, `<textarea>`,
   `[contenteditable]`, or a dialog/sheet has focus. Escape closes.
4. **Tour trigger** — inside the drawer footer ("Replay tour"), plus the automatic
   first-visit launch described below.
5. **Contextual `<InfoTooltip>`s** — three named surfaces (below).

No other entry point is added in this unit. `nav-user.tsx` is untouched.

### Contextual help cards — `<InfoTooltip>`

`components/help/info-tooltip.tsx` — a client wrapper over
`components/ui/tooltip.tsx` (protected, consumed as-is, not modified). API:

```tsx
<InfoTooltip label="Compliance Snapshot" content="…short copy…" />
```

Renders as:

```tsx
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
```

Notes:
- `<button>`, not `<span>` — real focus target, real keyboard activation.
- `h-3.5 w-3.5` is a deliberate sub-inline size: `ui-context.md` § 7 specifies
  `h-3 w-3` in badges and `h-4 w-4` inline; this sits inline next to `text-xs` card
  labels and reads correctly at 14px.
- Copy lives in `lib/help/content.ts` under `INFO_TOOLTIPS`, so the same sentence
  is never duplicated across surfaces.

**The three in-scope `<InfoTooltip>` deployments** (each is a sibling addition next
to an existing label — the label itself is not modified):

| Surface | Insertion point | Copy theme |
|---|---|---|
| Compliance Snapshot KPI | Next to the card label in `components/dashboard/kpi-cards.tsx` (the card that renders Paid / Partial / Overdue / N/A) | Counts, not percentages — a percentage hides *which* churches are struggling. Per `ui-context.md` § 5.3. |
| Four-Eyes threshold | Next to the Reconciliation hub header (`app/dashboard/reconciliation/page.tsx`) | Anything ≥ KES 20,000 (or touching 90+ day arrears, or any write-off) needs a second approver who is not the proposer. Value comes from `FOUR_EYES_THRESHOLD` in `lib/constants.ts` — do not hardcode 20,000 in copy. |
| Strict Bucket Isolation | Next to the period/bucket toggle label wherever that toggle renders (existing toggle component; the insertion is a sibling, not a replacement) | Annual and Monthly are independent ledgers. An overpayment in one never covers a shortfall in the other. Per `architecture.md` § 6. |

The existing Unit 18.2 leaderboard Score tooltip is **not** replaced;
`<InfoTooltip>` should be adopted for it in a follow-up unit so the pattern
converges in one place, but Unit 20 does not touch it.

### Help Drawer

- Built on existing `components/ui/sheet.tsx` (protected — **not** modified).
  `<Sheet side="right">`.
- Width override on `<SheetContent>`: `className="sm:max-w-md"` (the primitive
  default `sm:max-w-sm` is too narrow for card content).
- Header: `<SheetHeader>` with `<SheetTitle>Help</SheetTitle>` and
  `<SheetDescription>` naming the current tier (e.g., "National HQ — quick
  reference").
- Body: `<div className="overflow-y-auto px-4 pb-4 space-y-4">` — native scroll,
  because `components/ui/scroll-area.tsx` is confirmed absent from the repo and
  this unit does not install it.
- Footer (`<SheetFooter>`): "Replay tour" `<Button variant="outline">` on the
  left; "View full help →" `<Link>` on the right.
- Close: existing `showCloseButton` default (`true`) — no override.
- Escape closes (Base UI Dialog primitive default from `sheet.tsx`).

### Help Page (`/dashboard/help`)

- Server component under `app/dashboard/layout.tsx` — all existing gates
  (`is_active`, `requires_password_reset`, role resolution) apply automatically.
  `proxy.ts` already protects every `/dashboard/*` path; **no `proxy.ts` change**.
- `<h1 className="text-heading-2 font-bold text-foreground">Help &amp;
  Onboarding</h1>` plus a `text-paragraph-small text-muted-foreground` subtitle.
- Renders `<HelpContent variant="page" role={role} />`: all three tiers, current
  tier first, "Reading the reports" first inside each tier.
- No table, no export, no print, no search — this is a reference page, not a data
  surface.

### Guided Tour (first-party, no new dependency)

- Launched automatically on first visit to `/dashboard` per tier, re-launchable
  from the drawer footer.
- Persistence: `localStorage[HELP_TOUR_STORAGE_KEY_PREFIX + tier] =
  HELP_TOUR_VERSION`. A per-tier key so a user whose role changes sees the tour for
  their new tier. Bumping `HELP_TOUR_VERSION` re-runs once for everyone. Clearing
  storage re-runs. **No server state, no Prisma write, no audit event** — this is a
  UX nicety, not an auditable fact.
- Five steps per tier, no more (industry best practice is 3–5):

  1. **Welcome** — centered card, no target. Names the tier and offers Skip.
  2. **Sidebar** — target `[data-slot="sidebar-content"]`. Explains where the
     tier's navigation lives.
  3. **Main content** — target `[data-tour="main-content"]` (a new `data-tour`
     attribute on the existing `<main>` in `app/dashboard/layout.tsx`; no other
     change to that file's `<main>`).
  4. **Help trigger** — target `[data-tour="help-trigger"]`. Teaches where help
     lives, including the `?` shortcut.
  5. **Done** — centered card. Closes on any of: "Done", Escape, Skip.

- **Rendering** (`components/help/guided-tour.tsx`):
  - A `fixed inset-0 z-[100]` capture layer (`pointer-events-auto`, background
    `rgba(0,0,0,0.5)`), plus a second `fixed` element positioned exactly over the
    current target with `box-shadow: 0 0 0 9999px rgba(0,0,0,0.5)` — the standard
    "spotlight" pattern. This lifts the target *visually* above the overlay without
    re-parenting DOM.
  - The step card is `fixed z-[101]`, positioned relative to the target rect.
  - `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing at the step
    title, `aria-live="polite"` on the step body, focus moved into the card on
    step change, focus restored to the last trigger on close.
  - Escape dismisses. Click on the capture layer does **not** dismiss (avoids
    accidental mid-tour close). Next / Back / Skip are real `<Button>`s.
  - `prefers-reduced-motion: reduce` disables translate/scale transitions; keeps a
    150ms opacity fade.
- Step targets use existing DOM selectors where possible. Where a `data-tour`
  attribute is added, it is added in this unit:
  - `app/dashboard/layout.tsx` — `data-tour="main-content"` on `<main>`.
  - `components/layout/site-header.tsx` — `data-tour="help-trigger"` on the
    `<HelpTrigger>` mount (via prop forwarding, no direct DOM edit).
  - `components/ui/sidebar.tsx` (protected) already exposes
    `data-slot="sidebar-content"` and `data-slot="sidebar-footer"` — used as-is.

### Z-index reconciliation (against `ui-context.md` § 4)

- Base content: `z-0`
- Sticky topbar: `z-30`
- Sidebar: `z-40`
- Tooltips / dropdowns / popovers: `z-50` (unchanged)
- Help drawer (Sheet): `z-50` (matches `sheet.tsx`'s own overlay)
- Tour capture + spotlight: `z-[100]`
- Tour step card: `z-[101]`
- Sonner toasts: `z-[200]`

No changes to `components/ui/tooltip.tsx`, `sheet.tsx`, or any primitive.

### Responsive

- Page uses the existing `@container/main` + `px-4 lg:px-6` from
  `app/dashboard/layout.tsx` (untouched).
- Drawer: `w-3/4` mobile (Sheet default), `sm:max-w-md` desktop.
- Header trigger visible at all breakpoints. On ≤360px the breadcrumb may truncate
  — acceptable; verified no overlap in the checklist.

## Implementation

### Dependencies

**None.**

`react-joyride` is **not** installed and **will not** be installed in this unit.
Rationale: React 19.3.0 peer-dep incompatibility (react-joyride v2 declares React
15–18), unowned overlay/CSS injection that fights `components/ui/tooltip.tsx` and
`sheet.tsx` at `z-50`, and no focus trap / `aria-live` / Escape support out of the
box — all of which the project requires. The build plan's `react-joyride` line is
satisfied in spirit by a first-party tour (`components/help/guided-tour.tsx`) that
consumes the existing design system. This decision is recorded in
`progress-tracker.md` under "Architecture Decisions" so it is not re-litigated.

No new `npm install`. `npx shadcn@latest add sheet` is **not** needed — `sheet.tsx`
already exists.

### Files to create

- `lib/help/constants.ts` — `HELP_TOUR_STORAGE_KEY_PREFIX`
  (`"mfa-help-tour-seen-"`), `HELP_TOUR_VERSION` (`"1"`),
  `HELP_DRAWER_MAX_WIDTH_CLASS` (`"sm:max-w-md"`). UI-only config. **Not** added to
  `lib/constants.ts` — that file is scoped to financial/operational business rules
  by its own header comment.
- `lib/help/content.ts` — types (`HelpTier`, `HelpSection`, `HelpEntry`,
  `InfoTooltipKey`) plus `HELP_CONTENT` (per-tier sections, "Reading the reports"
  first in each tier) and `INFO_TOOLTIPS` (the three inline copy blocks).
  Conditional national entries are stored as rules resolved at render time from
  `isFinanceAdmin` / `isOperationsAdmin` / explicit treasurer/overseer checks. The
  "Reading the reports" section pulls descriptions from
  `getReportsForRole(toReportRole(role))` in `lib/utils/report-registry.ts` — never
  re-authored here.
- `lib/help/tour-steps.ts` — `TourStep` type plus `TOUR_STEPS` keyed by tier. Each
  step has `target: string | null`, `title`, `body`, `placement?: "top" | "bottom"
  | "left" | "right"`.
- `components/help/help-drawer-provider.tsx` — client. Context provider exposing
  `useHelpDrawer()` with `{ open, openDrawer, closeDrawer }`. Mounts one
  `<HelpDrawer />` per tree and owns the global `?` keyboard listener (suppressed
  on inputs/textareas/contenteditable/dialogs/sheets). Escape closes.
- `components/help/help-drawer.tsx` — client. The `<Sheet>` described above.
- `components/help/help-content.tsx` — shared renderer. Prop
  `variant: "page" | "drawer"` and `role: Role | null`. Renders the current tier
  (or all tiers in `page` mode, current first), "Reading the reports" first inside
  each tier.
- `components/help/help-trigger.tsx` — client. Ghost icon button. `variant:
  "header" | "sidebar"` picks Lucide vs Tabler icon. `onClick` → `openDrawer()`.
  Accepts a `data-tour` prop, forwarded onto the underlying `<button>`.
- `components/help/guided-tour.tsx` — client. First-party tour described above.
  Receives `role`. Reads `localStorage` on mount; if the per-tier key is absent or
  stale, runs once. Exposes a `replayTour()` imperative handle to the drawer footer
  via a small ref/callback prop.
- `components/help/info-tooltip.tsx` — client. The `<InfoTooltip>` wrapper
  described above.
- `app/dashboard/help/page.tsx` — server component. Reads `getCurrentUserRole()`,
  computes `toReportRole`, renders `<HelpContent variant="page" role={role} />`.
  Wrapped in `<Suspense>` per the Next.js 16 pattern already used in
  `app/dashboard/layout.tsx`.

### Files to modify

- `app/dashboard/layout.tsx` — (a) wrap the `<SidebarProvider>` children with
  `<HelpDrawerProvider role={role}>`; (b) mount `<GuidedTour role={role} />` inside
  the authenticated tree, below the existing `is_active` /
  `requires_password_reset` gates; (c) add `data-tour="main-content"` to the
  existing `<main>`. No other line changed. The `<main>` class list,
  `@container/main` wrapper, and Suspense fallback are untouched.
- `components/layout/site-header.tsx` — add
  `<div className="ml-auto flex items-center gap-2"><HelpTrigger variant="header" data-tour="help-trigger" /></div>`
  after the breadcrumb `<nav>`. Nothing removed. `<SidebarTrigger>` and breadcrumb
  logic untouched.
- `components/layout/app-sidebar.tsx` — append
  `{ title: 'Help', url: '/dashboard/help', icon: IconHelp }` to the `navSecondary`
  array (the line where `Settings` is defined). Add `IconHelp` to the existing
  `@tabler/icons-react` import. No other change.
- `components/dashboard/kpi-cards.tsx` — add one
  `<InfoTooltip label="Compliance Snapshot" content={INFO_TOOLTIPS.complianceSnapshot} />`
  next to the Compliance Snapshot card label. Sibling only; label untouched.
- `app/dashboard/reconciliation/page.tsx` — add one
  `<InfoTooltip label="Four-Eyes Approval" content={INFO_TOOLTIPS.fourEyes} />`
  next to the hub header. Sibling only.
- The existing period/bucket toggle component (wherever the Annual/Monthly toggle
  label renders — the developer will locate the exact file at implementation time;
  it is referenced in `components/dashboard/dashboard-view.tsx` and
  `components/payments/payments-table.tsx`) — add one
  `<InfoTooltip label="Strict Bucket Isolation" content={INFO_TOOLTIPS.strictBucketIsolation} />`
  as a sibling next to the toggle label. If both consumers render the toggle, both
  receive the sibling. The insertion point is recorded in the implementation
  session's diff for review.

### Files NOT modified

- `components/ui/*` — protected. `sheet.tsx`, `tooltip.tsx` consumed as-is.
- `lib/utils.ts` — protected `twMerge` block untouched.
- `lib/constants.ts` — financial/operational domain, untouched.
- `lib/utils/report-registry.ts` — descriptions remain the single source of report
  interpretation copy. Unit 20 renders them; it does not edit them. Adding
  per-report `interpretationNote` is deferred to a follow-up unit.
- `proxy.ts` — already covers `/dashboard/*`; `/dashboard/help` inherits the gate.
- `prisma/*` — no schema, no migration.
- `app/layout.tsx` — root layout mounts no help UI.
- `components/ui/scroll-area.tsx` — confirmed absent; not installed; native scroll
  used instead.

### Out of scope (Open Questions, not this unit)

- Server-side persistence of tour completion. `localStorage` only.
- Search within `/dashboard/help`. Content set is small; revisit when the section
  count exceeds ~30.
- Multi-language. English only, matching the rest of the app.
- Adopting `<InfoTooltip>` for the existing Unit 18.2 leaderboard Score tooltip.
  Candidate follow-up.
- Any change to `components/ui/tooltip.tsx`, `sheet.tsx`, or other primitives.
- Tour steps that span multiple pages. The tour is `/dashboard`-only and
  read-only.
- Interactive tutorials that mutate data.
- Per-report "watch for" notes rendered inline next to analytics (e.g., Discrepancy
  column warning on Allocation Breakdown, YoY cash-basis reminder). Requires an
  `interpretationNote` field on `report-registry.ts` — a schema-and-registry
  change, not presentation-only. Deferred.

## Verification Checklist

- [ ] `/dashboard/help` returns 200 for one user from each tier (National /
      Regional / Local).
- [ ] Help trigger visible in the dashboard header for all authenticated roles.
- [ ] Help sidebar entry visible under "Settings" for all authenticated roles.
- [ ] Drawer opens from the header trigger.
- [ ] Drawer opens from the sidebar entry.
- [ ] Drawer opens via `?` keyboard shortcut from `/dashboard`.
- [ ] `?` does NOT open the drawer while focus is inside an `<input>`,
      `<textarea>`, `[contenteditable]`, or an open dialog/sheet.
- [ ] Escape closes the drawer.
- [ ] Drawer closes on route change (verified across at least two `/dashboard/*`
      transitions).
- [ ] Page shows all three tiers; the current user's tier appears first.
- [ ] `/dashboard/help` and the drawer show **"Reading the reports" as the first
      section** for every tier.
- [ ] The "Reading the reports" section **sources its per-report descriptions from
      `report-registry.ts`** (change a registry description locally and confirm the
      rendered help updates — revert).
- [ ] `#reading-the-reports` anchor scrolls correctly on `/dashboard/help` (the
      "View full help →" link from the drawer lands on it).
- [ ] National-tier content shows "Mock KCB" for a Finance Admin session and hides
      it for a National Treasurer session.
- [ ] National-tier content shows "Users" for an Operations Admin session and hides
      it for a Finance Admin session.
- [ ] Every `<InfoTooltip>` renders within `max-w-[300px]`; no layout collapse; no
      `whitespace-nowrap` override added to `TooltipContent`.
- [ ] Compliance Snapshot `<InfoTooltip>` renders as a real `<button>` with
      `aria-label="About Compliance Snapshot"`; click and keyboard activation both
      open the tooltip.
- [ ] Four-Eyes `<InfoTooltip>` copy reads the value from `lib/constants.ts`
      (change `FOUR_EYES_THRESHOLD` locally and confirm the rendered copy updates —
      revert).
- [ ] Strict Bucket Isolation `<InfoTooltip>` renders on both the dashboard view
      and the payments view (if both render the toggle).
- [ ] Guided tour runs on first visit to `/dashboard` per tier and does NOT re-run
      on subsequent visits (`localStorage` persists — verify by refreshing once).
- [ ] Changing a user's role (e.g., Finance → Operations in a dev session) causes
      the new tier's tour to run once.
- [ ] Guided tour is relaunchable from the drawer footer "Replay tour" button.
- [ ] Clearing `localStorage` and reloading causes the tour to run again.
- [ ] Tour has `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing at
      the step title, and `aria-live="polite"` on the body.
- [ ] Focus moves into the tour step card on each step change; focus returns to the
      trigger on close.
- [ ] Escape dismisses the tour; click on the capture layer does NOT.
- [ ] With `prefers-reduced-motion: reduce` set in the OS, the tour keeps a fade
      but drops translate/scale transitions.
- [ ] Tour is above page content and below Sonner toasts (open a toast while the
      tour is running to verify).
- [ ] No `<TooltipTrigger>` is rendered outside a `<Tooltip.Root>` (Base UI runtime
      check — click every new tooltip trigger).
- [ ] `data-tour="sidebar-content"` and `data-tour="main-content"` resolve on the
      rendered DOM.
- [ ] `npx tsc --noEmit` — clean.
- [ ] `npm run lint` — 0 warnings, 0 errors.
- [ ] `npm run build` — passes with **29/29 pages** (was 28/28; `/dashboard/help`
      adds one route).
- [ ] No Prisma migration created; `npx prisma7 migrate status` shows up to date.
- [ ] All eight invariants in `context/architecture.md` hold — specifically: no
      financial mutation, no idempotency change, no new RBAC guard, no async work
      introduced, no protected file modified.
- [ ] `context/progress-tracker.md` records: Unit 20 completion; the "first-party
      tour instead of react-joyride" decision under Architecture Decisions; the
      `<InfoTooltip>` pattern as the shared inline-help primitive; the per-tier
      `localStorage` key as the persistence mechanism; the deferred adoption of
      `<InfoTooltip>` for the Unit 18.2 leaderboard Score tooltip; and the new
      build page count (29/29).
```

---

## Step 1 — mark Unit 20 in progress

### 1a. Verify the amended spec is on disk

In VS Code terminal (repo root):

```
dir "context\specs\20-In-App Help and Onboarding.md"
```

Expected: one line — file path and a non-zero size. If "File Not Found", paste the spec first; do not proceed.

### 1b. Two edits in `context/progress-tracker.md`

**Edit 1 — `## Current Goal`, the last bullet.** Replace:

```
- **Next unit:** Unit 19 (Guided Payment Flow / Pay Now Wizard). **18.2.1 is DEFERRED** pending client clarification of the three score axes (see `## Open Questions`).
```

With:

```
- **Unit 20: In-App Help & Onboarding** — IN PROGRESS (started 2026-11-20). Spec authored at `context/specs/20-In-App Help and Onboarding.md`.
- **19c (STK Push) and 19.5 (go-live) remain blocked** on sandbox credential registration and bank Go-Live approvals respectively. **18.2.1 remains DEFERRED** pending client clarification of the three score axes (see `## Open Questions`).
```

**Edit 2 — `## In Progress`, add this block as the first entry (above the Unit 19 block):**

```markdown
- **Unit 20: In-App Help & Onboarding** — started 2026-11-20.
  - Spec authored: `context/specs/20-In-App Help and Onboarding.md`.
  - Decisions locked (recorded under `## Architecture Decisions` at unit close):
    1. First-party tour in `components/help/guided-tour.tsx` — `react-joyride` NOT installed (React 19.3.0 peer-dep incompatibility; no focus trap / aria / Escape out of the box).
    2. `<InfoTooltip>` contextual help on three named surfaces: Compliance Snapshot KPI, Four-Eyes threshold, Strict Bucket Isolation.
    3. `?` keyboard shortcut opens the Help drawer (suppressed in inputs / textareas / contenteditable / dialogs).
    4. Five entry surfaces. `/dashboard/help` adds one route → build 28/28 → **29/29**.
    5. **Reports & analytics interpretation is the first help section for every tier** — sourced from `report-registry.ts`, not re-authored. Per-report `interpretationNote` on the reports surface deferred to a follow-up.
  - No schema change. No new dependency. No protected file touched.
