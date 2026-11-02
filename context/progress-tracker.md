# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase
Unit 09.1 - In Progress (Enterprise Consistency & Polish)

## Current Goal
Complete the full CRUD actions for Churches and refactor the National Dashboard to the shadcn standard.

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
  - Overhauled Regions Tab: New KPI cards, shadcn Data Table, Cross-filtering drill-downs, SMS/Edit actions.
  - Overhauled Churches Tab: KPI cards with fractional local/national display, shadcn Data Table, Cross-filtering.
  - Mapped `globals.css` to semantic theme variables.

## In Progress (Unit 09.1)
- [x] **Phase 1:** Sidebar & Topbar refactored to semantic tokens (removed hardcoded hexes).
- [ ] **Phase 2:** Church Actions (View/Edit/Delete) — Server Actions done, Dialogs pending.
- [ ] **Phase 3:** Remaining corrections (KPI card defaults, searchParams fix).
- [ ] **Phase 4:** National Dashboard refactor (KPI Cards + Charts).

## Next Up
- Complete Unit 09.1 Phases 2-4.
- Begin Unit 10: Payments Tab (Audit Ledger).

## Open Questions
- None.

## Architecture Decisions
- **Design System:** All components must use shadcn semantic tokens (`bg-primary`, `text-muted-foreground`, etc.) defined in `globals.css`.
- **Dialogs:** Controlled at the parent level to prevent Base UI unmounting flashes.
- **Data Tables:** Custom React tables using shadcn `<Table>` primitives, featuring sorting, filtering, and cross-tab drill-downs.
- **Financial Logic:** Fair compliance based on "Expected to Date" (Annual due after March 31st, Monthly accumulates).
- **Auth & Security:** `proxy.ts` middleware and Supabase RLS.

## Session Notes
- **Git Setup:** Remote origin is `https://github.com/gilbertmulahake-commits/maranatha-church-app.git`.
- **Browser Extension Warning:** Hydration mismatch occurs due to a browser extension injecting attributes. Harmless; use Incognito.
- **Future Enhancements (Idea Log):** Client requested detailed profiles for Churches (membership, coords, history), Pastors (full bio, transfers), and Treasurers. To be addressed post-MVP.