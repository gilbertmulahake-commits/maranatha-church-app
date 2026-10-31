# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase
Unit 08 - Complete

## Current Goal
Begin Unit 09: Incentive Scoring Engine

## Completed
- Initialized project overview and architecture.
- Defined UI/UX design system (shadcn/ui, Tailwind).
- Created the 11-Unit Build Plan.
- Initialized Git repository and pushed `main` branch to GitHub.
- **Unit 01: Database Initialization** (Prisma, Supabase, and Schema Migration).
- **Unit 02: Authentication & Access Control** (Supabase Auth, Proxy Middleware, RLS Policies).
- **Unit 03: App Shell & UI Layout** (Sidebar, Topbar, Dashboard placeholders).
- **Unit 04: Church Management (CRUD)** (Regions CRUD, Churches CRUD, Custom Data Table).
- **Unit 05: Mock KCB Webhook & Payment Reconciliation** (Webhook endpoint, Idempotency check, Reconciliation engine, Mock simulator).
- **Unit 06: National HQ Dashboard** (Real-time KPIs, Progress Bar, Bar Chart, Donut Chart).
- **Unit 07: Regional Dashboards & Alerts** (Role-based routing, Regional KPIs, Church compliance table).
- **Unit 08 & 08.5: SMS Integration & Hierarchy** (Mock SMS engine, SmsLog table, Automated receipts, Pastor reminders, 6-Role hierarchy implementation, and UI table updates for Pastor/Treasurer details).

## In Progress
- None.

## Next Up
- Unit 09: Incentive Scoring Engine (40/30/20/10 formula).

## Open Questions
- What exact URL/structure will the Mock KCB API use for testing? *(Answered: `/api/webhooks/kcb`)*

## Architecture Decisions
- **Database:** Chose Supabase (PostgreSQL) over local XAMPP for easy deployment, built-in Auth, and Postgres compatibility with Prisma.
- **Reconciliation:** Will use the `BillRefNumber` from KCB to match Church IDs. Unmatched IDs go to a manual review queue.
- **UI:** Opted for a modern, data-dense enterprise look using shadcn/ui and `tabular-nums` for financial clarity.
- **Prisma Version:** Using `@prisma/prisma7` compatibility package with `prisma.config.ts` to handle v8 breaking changes.
- **Auth & Security:** Implemented `proxy.ts` (Next.js 16 middleware) for route protection and Supabase RLS policies to enforce strict data isolation.
- **UI Components:** Using shadcn/ui with Base UI (`render` prop instead of `asChild`).
- **Data Table:** **DECISION:** TanStack Table v9 was abandoned due to unstable runtime APIs. We use a custom React table with `useState` and `useMemo`. It is lightweight, zero-dependency, and works perfectly for 1,600+ churches.
- **Database Connection:** Switched from Session Pooler (`5432`) to Transaction Pooler (`6543`) with `?pgbouncer=true` to prevent `ConnectionClosed` errors during Next.js hot-reloading.
- **Charts:** Using `recharts` for premium, interactive data visualizations.
- **Dynamic Rendering:** Added `await connection()` to dashboard pages to force dynamic rendering (Next.js 16 requirement for routes using Auth/Cookies).
- **SMS & Hierarchy:** Implemented a 6-role hierarchy (National Treasurer, National Overseer, Regional Chairman, Regional Treasurer, Local Pastor, Church Treasurer). Mock SMS routing sends receipts to Treasurers and Reminders to Pastors.

## Session Notes
- Mock KCB API will need to be built as a Next.js API route to simulate webhook payloads.
- Client revealed historical inability to collect full annual revenue. The system is designed to solve revenue leakage through automation.
- **Git Setup:** Remote origin is `https://github.com/gilbertmulahake-commits/maranatha-church-app.git`.
- Database successfully connected via Supabase Transaction Pooler.
- **RECOVERY (Unit 02):** A case-sensitivity issue during a GitHub merge deleted the `prisma` folder locally. Restored `schema.prisma` manually and used `npx prisma7 db push` to re-sync without data loss. All future Prisma commands must use `npx prisma7`.
- **RECOVERY (Unit 06/07):** The `context` folder casing issue caused local sync conflicts. Resolved permanently by deleting the uppercase folder on GitHub and merging the lowercase version. The folder is now permanently `context/specs/`.
- **RECOVERY (Unit 08):** Encountered an enum alteration error during schema push due to RLS policies and old user roles. Fixed by dropping RLS policies, deleting old users, pushing the schema, and recreating the policies and users with the new 6-role hierarchy.
- **Browser Extension Warning:** A hydration mismatch error occurs in non-incognito browsers due to an extension injecting `webcrx`/`data-qb-installed` attributes. This is a harmless false positive; use Incognito for clean development.
- **Future Enhancements (Idea Log):** Client requested detailed profiles for Churches (membership, coords, history), Pastors (full bio, transfers), and Treasurers. To be addressed as a post-MVP enhancement via a new `Leader` and `ChurchProfile` model.