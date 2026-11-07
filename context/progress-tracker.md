# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase
Unit 14.0 - Complete

## Current Goal
Begin Unit 15: Deployment Preparation & Final Polish

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
- **Unit 10.0: Financial Ledger Upgrade**
  - Added `billing_year Int` to the `Payment` model.
  - Upgraded financial logic from a "reset on Jan 1" model to a cumulative lifetime calculation via `getExpectedUpToDate(startDate, upToDate)`.
  - Implemented the Month/Year toggle in the `TableToolbar` and updated all table views to swap columns based on the active period.
- **Unit 10.1: Strict Bucket Isolation & Dynamic Statuses**
  - Enforced **Strict Bucket Isolation**: Annual and Monthly contributions are treated as completely separate ledgers.
  - Implemented **Dynamic Statuses**: Tables and KPI cards now swap between `annualStatus` and `monthlyStatus` based on the active `periodView`.
  - Added `'N/A'` status for churches that owe 0 in a specific bucket (e.g., joined after the Annual deadline).
  - Built dynamic KPI footers (Annual vs Monthly breakdowns, This Month expected vs collected).
  - Updated `sendReminder` and `sendBulkReminders` to generate intelligent, bucket-specific SMS messages.
- **Unit 10.2: Payments Tab (Audit Ledger)**
  - Built the transaction-level ledger with role-based isolation.
  - Implemented a full data table with sorting, pagination, global search, and specific filters for Payment Type and Method.
  - Added 4 KPI cards for Total Transactions, Total Volume, Annual/Monthly Split, and This Month volume.
  - *Architecture Note:* Kept KPI cards static (global lifetime totals) rather than dynamic, to ensure the ledger remains a stable source of truth for auditors.
- **Unit 11.1: Reporting UI (Arrears & Cashbook)**
  - Built the `/dashboard/reports` page with a custom segmented toggle.
  - Arrears table displays strict bucket isolation with a sticky summary footer for grand totals.
  - Cashbook table features a dynamic date picker to view daily transactions.
- **Unit 11.2: CSV Export Engine**
  - Created a generic `exportToCsv` utility (`lib/utils/export.ts`).
  - Added "Export" buttons to the Payments Ledger, Arrears Report, and Daily Cashbook.
- **Unit 12.1: User Profile & Settings**
  - Built the `/dashboard/settings` page.
  - Added read-only Profile Card showing Email, Role, Region, and Church assignments.
  - Built a secure password update form using Supabase Auth client and Sonner toasts.
- **Unit 12.2: User Management (Admin)**
  - Added the `/dashboard/users` route (strictly restricted to National HQ).
  - Built the `UsersTable` to display all system users.
  - Built the `InviteUserDialog` with dynamic form fields and rollback safety catch.
- **Unit 13.1: Local Church Dashboard & RBAC**
  - Built dedicated Local Pastor dashboard with Strict Bucket Isolation.
  - Added interactive filtering (Clicking Annual/Monthly cards filters the payment history).
  - Enforced RBAC in sidebar (removed Reports for Local roles).
- **Unit 13.2: National Dashboard Upgrade & UI Stabilization**
  - Transformed National Dashboard into a 12-column Command Center (Hero, Live Feed, Charts, Leaderboard).
  - Implemented year-specific Hero target logic (This Year vs 17.6M).
  - Upgraded all charts to shadcn ChartContainer and semantic CSS variables.
  - Standardized all tables with `<DataTablePagination>` and fixed Base UI dropdown context bugs.
  - Stabilized layout collapses using inline `maxWidth` for Settings and Mock KCB.
- **Unit 14.0: Prepaid Status UI**
  - Translated backend credit values into human-readable "Paid (X Years/Months Prepaid)" text.
  - Updated `church-table.tsx` and `regional-table.tsx` to use the new `formatPrepaidStatus` helper.
  - Deferred full webhook splitting and `PaymentAllocation` table to V2.

## In Progress
- None.

## Next Up
- **Unit 15: Deployment Preparation**
  - Set up Vercel, connect Supabase production keys, run `prisma migrate deploy`.
- **V2 Enhancements**: 
  - Full FIFO Payment Allocation Ledger.
  - Real Africa's Talking SMS API integration.
  - Real KCB Daraja API integration.

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
- **Prepaid Status (Phase 1):** UI-only translation of credits. No webhook splitting (protects 1:1 bank reconciliation). Deferring `PaymentAllocation` table to V2.

## Session Notes
- **Git Setup:** Remote origin is `https://github.com/gilbertmulahake-commits/maranatha-church-app.git`.
- **Browser Extension Warning:** Hydration mismatch occurs in normal browsers due to an extension injecting attributes. Harmless; use Incognito for development.
- **Stable Stack (Do Not Blindly Upgrade):** Next.js 16, Prisma 7, Tailwind v4, Base UI (shadcn). Dependency tree is clean (no Radix leakage). Do not run `npm update` without testing.
- **Layout Collapse Fix:** Flexbox `min-width: auto` caused cards to collapse. The enterprise fix is `min-w-0` on the layout wrapper. For specific pages (Settings, Mock KCB), inline `style={{ width: '100%', maxWidth: 'X' }}` is used as a bulletproof workaround.