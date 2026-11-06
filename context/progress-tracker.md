# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase
Unit 11.2 - Complete

## Current Goal
Begin Unit 12: User Management & Settings

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
  - **Global Fixes:** Fixed `cn` utility, restored Tailwind container sizes, standardized KPI cards (gradients, hover lift), and implemented `TableToolbar`.
  - **Role Identity:** Adopted "Universal Capability, Contextual Identity" model. SMS messages stamped with sender ("National Office" vs "Regional Office").
  - **Drill-Downs:** Built `/dashboard/regions/[id]` for National Treasurer drill-downs.
- **Unit 10.0: Financial Ledger Upgrade (Pre-requisite for Payments Tab)**
  - Added `billing_year Int` to the `Payment` model.
  - Upgraded financial logic from a "reset on Jan 1" model to a cumulative lifetime calculation via `getExpectedUpToDate(startDate, upToDate)`.
  - Implemented the Month/Year toggle in the `TableToolbar` and updated all table views to swap columns based on the active period.
  - *Deviation:* Used a temporary `@default(2026)` migration workaround for existing test data instead of a separate backfill script.
- **Unit 10.1: Strict Bucket Isolation & Dynamic Statuses**
  - Enforced **Strict Bucket Isolation**: Annual and Monthly contributions are treated as completely separate ledgers. Overpayment in one does not cover arrears in the other.
  - Implemented **Dynamic Statuses**: Tables and KPI cards now swap between `annualStatus` and `monthlyStatus` based on the active `periodView`.
  - Added `'N/A'` status for churches that owe 0 in a specific bucket (e.g., joined after the Annual deadline).
  - Built dynamic KPI footers (Annual vs Monthly breakdowns, This Month expected vs collected).
  - Updated `sendReminder` and `sendBulkReminders` to generate intelligent, bucket-specific SMS messages.
- **Unit 10.2: Payments Tab (Audit Ledger)**
  - Built the transaction-level ledger with role-based isolation (National sees all, Regional sees only their region).
  - Implemented a full data table with sorting, pagination, global search, and specific filters for Payment Type and Method.
  - Added 4 KPI cards for Total Transactions, Total Volume, Annual/Monthly Split, and This Month volume.
  - *Architecture Note:* Kept KPI cards static (global lifetime totals) rather than dynamic, to ensure the ledger remains a stable source of truth for auditors.
- **Unit 11.1: Reporting UI (Arrears & Cashbook)**
  - Built the `/dashboard/reports` page with a custom segmented toggle (Arrears vs. Cashbook).
  - Arrears table displays strict bucket isolation with a sticky summary footer for grand totals.
  - Cashbook table features a dynamic date picker to view daily transactions.
- **Unit 11.2: CSV Export Engine**
  - Created a generic `exportToCsv` utility (`lib/utils/export.ts`).
  - Added "Export" buttons to the Payments Ledger, Arrears Report, and Daily Cashbook.
  - Export logic strictly exports the *currently filtered* data, maintaining the active view's context.

## In Progress
- None.

## Next Up
- **Unit 12: User Management & Settings**
  - Build the Settings page for profile updates.
  - Build the User Management table for National HQ to assign roles and regions.

## Open Questions
- None.

## Architecture Decisions
- **Design System:** Strict use of semantic tokens defined in `globals.css`. No hardcoded hexes.
- **KPI Cards:** All cards use `cardClasses` (gradient, hover lift, `h-full`), `text-heading-1` numbers, and `StackedBar` composition charts.
- **Tables:** All tables use `TableToolbar`, checkboxes, and shadcn `<Table>` primitives.
- **Role Identity:** Universal Capability, Contextual Identity. All authorized roles can act, but SMS reflects sender ("National Office" vs "Regional Office").
- **Next.js 16:** Abandoned `export const instant = false`. All auth-protected routes require the universal `<Suspense>` wrapper and `await connection()` inside an async content component to resolve `cacheComponents` prerender errors.
- **Financial Ledger:** Cumulative lifetime calculation via `getExpectedUpToDate()`. Strict Bucket Isolation applies across all tables, KPIs, and SMS messages.
- **Audit Ledger:** Uses Static Global KPIs. The table below filters and searches, but the KPIs represent the total lifetime inflow for the user's role scope.
- **Sonner:** All user feedback (success, error, info) uses Sonner toasts. No `alert()`.

## Session Notes
- **Git Setup:** Remote origin is `https://github.com/gilbertmulahake-commits/maranatha-church-app.git`.
- **Browser Extension Warning:** Hydration mismatch occurs in normal browsers due to an extension injecting attributes. Harmless; use Incognito for development.
- **Future Enhancements (Idea Log):** 
  - Detailed profiles for Churches (membership, coordinates, history).
  - Pastors (full bio, transfer tracking).
  - Treasurers (full bio).
  - These are post-MVP features requested by the client.