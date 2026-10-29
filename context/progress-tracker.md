# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase
Unit 04 - Complete

## Current Goal
Begin Unit 05: Mock KCB Webhook & Payment Reconciliation

## Completed
- Initialized project overview and architecture.
- Defined UI/UX design system (shadcn/ui, Tailwind).
- Created the 11-Unit Build Plan.
- Initialized Git repository and pushed `main` branch to GitHub.
- **Unit 01: Database Initialization** (Prisma, Supabase, and Schema Migration).
- **Unit 02: Authentication & Access Control** (Supabase Auth, Proxy Middleware, RLS Policies).
- **Unit 03: App Shell & UI Layout** (Sidebar, Topbar, Dashboard placeholders).
- **Unit 04: Church Management (CRUD)** (Regions CRUD, Churches CRUD, TanStack Data Table).

## In Progress
- None.

## Next Up
- Unit 05: Mock KCB Webhook Engine.

## Open Questions
- What exact URL/structure will the Mock KCB API use for testing?

## Architecture Decisions
- **Database:** Chose Supabase (PostgreSQL) over local XAMPP for easy deployment, built-in Auth, and Postgres compatibility with Prisma.
- **Reconciliation:** Will use the `BillRefNumber` from KCB to match Church IDs. Unmatched IDs go to a manual review queue.
- **UI:** Opted for a modern, data-dense enterprise look using shadcn/ui and `tabular-nums` for financial clarity.
- **Prisma Version:** Using `@prisma/prisma7` compatibility package with `prisma.config.ts` to handle v8 breaking changes.
- **Auth & Security:** Implemented `proxy.ts` (Next.js 16 middleware) for route protection and Supabase RLS policies to enforce strict data isolation.
- **UI Components:** Using shadcn/ui with Base UI (`render` prop instead of `asChild`).
- **Data Table:** TanStack Table v9 was used despite TypeScript type warning squiggles. The runtime works perfectly via Turbopack. A fallback custom table was built and documented as a backup.

## Session Notes
- Mock KCB API will need to be built as a Next.js API route to simulate webhook payloads.
- Client revealed historical inability to collect full annual revenue. The system is designed to solve revenue leakage through automation.
- **Git Setup:** Remote origin is `https://github.com/gilbertmulahake-commits/maranatha-church-app.git`.
- Database successfully connected via Supabase Session Pooler.
- **RECOVERY (Unit 02):** A case-sensitivity issue during a GitHub merge deleted the `prisma` folder locally. Restored `schema.prisma` manually and used `npx prisma7 db push` to re-sync without data loss. All future Prisma commands must use `npx prisma7`.
- **Browser Extension Warning:** A hydration mismatch error occurs in non-incognito browsers due to an extension injecting `webcrx` attributes. This is a harmless false positive; use Incognito for clean development.