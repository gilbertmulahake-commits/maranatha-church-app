# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase
Unit 09.1 - Complete

## Current Goal
Begin Unit 10.0: Financial Ledger Upgrade (Pre-requisite for Payments Tab)

## Completed
- **Unit 01: Database Initialization**
  - Configured Supabase (PostgreSQL) and Prisma ORM (`@prisma/prisma7`).
  - Created core schema: `Region`, `Church`, `Payment`, `RegionalScore`.
  - Resolved Prisma v8 breaking changes via `prisma.config.ts`.
- **Unit 02: Authentication & Access Control**
  - Configured Supabase Auth (Client & Server components).
  - Implemented Next.js 16 `proxy.ts` for route protection.
  - Built Login UI with shadcn.
  - Enforced initial Row Level Security (RLS) policies.
- **Unit 03: App Shell & UI Layout**
  - Built the Sidebar, Topbar, and App Shell wrapper.
  - Initialized shadcn/ui with Base UI (replaced `asChild` with `render`).
  - Created placeholder pages for all navigation links.
- **Unit 04: Church Management (CRUD)**
  - Built Server Actions for Region and Church creation.
  - Implemented the initial custom Data Table (later abandoned TanStack v9 due to instability).
  - Built Create Region and Create Church dialogs.
- **Unit 05: Mock KCB Webhook & Payment Reconciliation**
  - Built the `/api/webhooks/kcb` route handler with Zod validation.
  - Implemented Idempotency check (preventing double-counting).
  - Built the Mock KCB Simulator UI to test the reconciliation engine.
- **Unit 06: National HQ Dashboard**
  - Integrated Recharts for Bar and Donut charts.
  - Created initial KPI cards (Total Collected, Target, Arrears).
  - Implemented `await connection()` to force dynamic rendering.
- **Unit 07: Regional Dashboards & Alerts**
  - Implemented role-based routing (Redirects Regional Chairmen to `/dashboard/regional`).
  - Built Regional KPIs and the Church compliance table.
  - Implemented strict RLS policies for data isolation.
- **Unit 08: SMS Integration & Hierarchy**
  - Built Mock SMS engine (`SmsLog` table) and Server Actions.
  - Integrated automated receipts into the KCB Webhook.
  - Expanded Roles to a 6-role hierarchy (National Treasurer, National Overseer, Regional Chairman, Regional Treasurer, Local Pastor, Church Treasurer).
  - Added Pastor details to the Church schema.
  - Built the "Remind Pastor" button on the Regional Dashboard.
- **Unit 09: Financial Logic, Incentive Scoring & Design System Foundation**
  - Implemented Fair Compliance logic (Annual/Monthly "Expected to Date" calculation).
  - Built the Incentive Scoring Engine (40/30/20/10 weighted formula) and Leaderboard.
  - Overhauled Regions Tab: New KPI cards, shadcn Data Table, Cross-filtering drill-downs.
  - Overhauled Churches Tab: KPI cards, shadcn Data Table, Cross-filtering.
  - Mapped `globals.css` to semantic theme variables.
- **Unit 09.1: Enterprise Consistency & Polish**
  - **Global Fixes:**
    - Fixed the broken `cn` utility in `lib/utils.ts` (using `clsx` and `tailwind-merge`). This resolved missing styles globally.
    - Restored Tailwind container sizes and breakpoints in `globals.css` to fix collapsed search bars.
    - Resolved Next.js 16 `cacheComponents` prerender errors by adding `export const instant = false` and `await connection()` to dashboard pages.
  - **KPI Card Standardization:**
    - Created `components/dashboard/stacked-bar.tsx` for composition visualization (Annual vs Monthly, Paid vs Partial vs Overdue).
    - Standardized all KPI cards (`kpi-cards.tsx`, `regional-kpi-cards.tsx`, `region-kpi-cards.tsx`, `church-kpi-cards.tsx`).
    - Applied identical wrapper (`h-full`, gradient background, hover lift), `text-heading-1 font-bold` for main figures, and unified footers.
    - Implemented truthful tie-handling on the "Top Region" KPI card (displays "Tied with X other regions").
  - **Table Standardization & Bulk Actions:**
    - Created `components/ui/table-toolbar.tsx` to unify titles, subtitles, search (`maxWidth: 24rem`), filters, and bulk actions.
    - Added functional checkboxes and bulk action bars to Churches, Regions, and Regional tables.
    - Wired `sendBulkReminders` action to the "Send Reminders" button in the toolbar.
  - **Role-Based Identity & Drill-Downs:**
    - Updated `sendSms` and `sendBulkReminders` to accept `senderRole` parameter. Messages now stamped with "from the Maranatha National Office" or "from the Maranatha Regional Office".
    - Built `/dashboard/regions/[id]` and `RegionDetailClient` for National Treasurer drill-downs.
    - Adopted "Universal Capability, Contextual Identity" model: All roles can View, Edit, and Remind. No bottlenecks created.
  - **Documentation:**
    - Rewrote `ui-context.md` to strictly follow the Spec-Driven 10-section structure (Theme, Colors, Typography, Radii, Component Library, Layout, Icons, Visualization, Interaction, Role Identity).
    - Updated `architecture.md` with sections on Communication Identity and Financial Ledger.

## In Progress
- None.

## Next Up
- **Unit 10.0: Financial Ledger Upgrade**
  - Add `billing_year` to the `Payment` model.
  - Update `getExpectedToDate` to calculate cumulative expected vs. actual (track carry-forwards).
  - Activate the Month/Year view toggle in `TableToolbar`.
- **Unit 10: Payments Tab (Audit Ledger)**
  - Build the transaction-level view with date range picker, search, and export.
- **Unit 11: Reporting & Export**
  - Build Daily Cashbook, Arrears Report, CSV/PDF exports.
- **Unit 12: User Management & Settings**
  - Build invitation system, role assignment.

## Open Questions
- None.

## Architecture Decisions
- **Design System:** Strict use of semantic tokens defined in `globals.css`. No hardcoded hexes.
- **KPI Cards:** All cards use `cardClasses` (gradient, hover lift, `h-full`), `text-heading-1` numbers, and `StackedBar` composition charts.
- **Tables:** All tables use `TableToolbar`, checkboxes, and shadcn `<Table>` primitives.
- **Role Identity:** Universal Capability, Contextual Identity. All authorized roles can act, but SMS reflects sender ("National Office" vs "Regional Office").
- **Next.js 16:** `await connection()` and `export const instant = false` required for auth-protected dynamic routes.
- **Financial Ledger:** Deferred to Unit 10.0 to correctly handle `billing_year` carry-forwards and prepaid lump sums, preventing silent revenue leakage.
- **Sonner:** All user feedback (success, error, info) uses Sonner toasts. No `alert()`.

## Session Notes
- **Git Setup:** Remote origin is `https://github.com/gilbertmulahake-commits/maranatha-church-app.git`.
- **Browser Extension Warning:** Hydration mismatch occurs in normal browsers due to an extension injecting attributes. Harmless; use Incognito for development.
- **Future Enhancements (Idea Log):** 
  - Detailed profiles for Churches (membership, coordinates, history).
  - Pastors (full bio, transfer tracking).
  - Treasurers (full bio).
  - These are post-MVP features requested by the client.