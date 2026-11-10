# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase
Unit 14.6 - Complete

## Current Goal
Begin Unit 15: Deployment Preparation

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
  - Overhauled Regions Tab and Churches Tab with cross-filtering drill-downs.
  - Mapped `globals.css` to semantic theme variables.
- **Unit 09.1: Enterprise Consistency & Polish**
  - **Global Fixes:** Fixed `cn` utility, standardized KPI cards, implemented `TableToolbar`.
  - **Role Identity:** Adopted "Universal Capability, Contextual Identity" model.
  - **Drill-Downs:** Built `/dashboard/regions/[id]` for National Treasurer drill-downs.
- **Unit 10.0: Financial Ledger Upgrade**
  - Added `billing_year Int` to the `Payment` model.
  - Upgraded financial logic to a cumulative lifetime calculation via `getExpectedUpToDate()`.
  - Implemented the Month/Year toggle in the `TableToolbar`.
- **Unit 10.1: Strict Bucket Isolation & Dynamic Statuses**
  - Enforced **Strict Bucket Isolation**: Annual and Monthly contributions are completely separate ledgers.
  - Implemented **Dynamic Statuses**: Tables and KPI cards swap between `annualStatus` and `monthlyStatus`.
  - Added `'N/A'` status for churches that owe 0 in a specific bucket.
  - Updated `sendReminder` and `sendBulkReminders` to generate intelligent, bucket-specific SMS messages.
- **Unit 10.2: Payments Tab (Audit Ledger)**
  - Built the transaction-level ledger with role-based isolation.
  - Implemented a full data table with sorting, pagination, global search, and filters.
  - Added 4 KPI cards for Total Transactions, Total Volume, Split, and This Month.
- **Unit 11.1: Reporting UI (Arrears & Cashbook)**
  - Built the `/dashboard/reports` page with a custom segmented toggle.
  - Arrears table displays strict bucket isolation with a sticky summary footer.
  - Cashbook table features a dynamic date picker.
- **Unit 11.2: CSV Export Engine**
  - Created a generic `exportToCsv` utility.
- **Unit 12.1: User Profile & Settings**
  - Built the `/dashboard/settings` page with Profile Card and Password Update form.
- **Unit 12.2: User Management (Admin)**
  - Added the `/dashboard/users` route (restricted to National HQ).
  - Built `UsersTable` and `InviteUserDialog`.
- **Unit 13.1: Local Church Dashboard & RBAC**
  - Built dedicated Local Pastor dashboard with Strict Bucket Isolation.
  - Added interactive filtering.
- **Unit 13.2: National Dashboard Upgrade & UI Stabilization**
  - Transformed National Dashboard into a 12-column Command Center.
  - Upgraded all charts to shadcn ChartContainer.
- **Unit 14.0: Prepaid Status UI**
  - Translated backend credit values into human-readable "Paid (X Years/Months Prepaid)" text.
  - Updated `church-table.tsx` and `regional-table.tsx` to use `formatPrepaidStatus`.
- **Unit 14.5: Payment Allocation Engine (Enterprise Phase)**
  - Added `PaymentAllocation` model to track exact period-by-period attribution.
  - Built pure allocation engine (`lib/utils/allocation.ts`) using a Year-by-Year priority model (Annual arrears → Current Annual → Monthly arrears → Current Month → Future Years).
  - Updated KCB Webhook to accept `Auto` mode, split payments using `createMany`, and handle mixed deposits.
  - Created and ran `scripts/backfill-allocations.ts` to retroactively allocate historical payments.
  - Refactored all 8 Server Action files to read Annual/Monthly sums from `allocations` rather than `payment_type`.
  - Added "Mixed" badge and Allocation Breakdown modal to the Payments Ledger.
- **Unit 14.6: Enterprise UI Polish & Consistency**
  - **Financial Logic:** Updated Dashboard, Regional, and Region actions to calculate Gross Arrears (`Math.max(0, expected - paid)`) per bucket.
  - **KPI Cards UI:** Swapped `text-heading-1` for `text-heading-2`. Added `truncate` to values and `shrink-0` to badges to prevent layout breakage on large figures.
  - **Mock KCB Layout:** Converted simulator page to a 2-column grid with an interactive "Testing Guide" panel.
  - **Harmonized Drill-Downs:** Replaced custom Church Profile and Region Detail UIs with unified `LocalKpiCards` and `RegionalDashboardClient` components.
  - **Sidebar:** Enforced strict RBAC (hiding Mock KCB from Regional/Local) and implemented the responsive Base UI `render` prop pattern.
  - **Tables:** Standardized ALL tables (`Payments`, `Churches`, `Regions`, `Regional`, `Arrears`, `Cashbook`, `Local History`) with `<TableToolbar>`, checkboxes, and bulk actions.
  - **Dialogs:** Standardized globally with `pr-12` close-button safety, `p-6` padding, and `text-heading-2` titles for forms vs `text-heading-3` for alerts.
  - **Exports:** Built the Enterprise Export Engine (`lib/utils/export-advanced.ts`) supporting CSV, Excel, and branded PDFs with Print support.
  - **Export Interceptor:** Built the `ExportConfirmDialog` which intercepts global exports/prints if rows are selected, allowing the user to choose between "Selected Only" or "All".
  - **Charts:** Replaced the Payment Methods doughnut chart with a real-time Church Compliance Breakdown doughnut chart.
  - **twMerge Fix:** Extended `tailwind-merge` in `lib/utils.ts` to recognize custom Figma typography and spacing tokens (e.g., `text-heading-1`, `p-xl`).

## In Progress
- None.

## Next Up
- **Unit 15: Deployment Preparation**
  - Vercel integration, production Supabase keys, `prisma migrate deploy`.
  - Live KCB API integration and Africa's Talking SMS API hookup.

## Open Questions
- **Offline Remittance Handling:** How to handle payments made via cash, cheques, or direct bank transfers that bypass the KCB M-Pesa automated webhook. This will require a manual entry UI for National HQ to log the payment and trigger the allocation engine, along with receipt generation.
- **Internal Communication Channel:** Deferred to post-Unit 15. An enterprise-grade inbox for threaded messaging, presence (online/busy), and archival.

## Architecture Decisions
- **Design System:** Strict use of semantic tokens defined in `globals.css`. No hardcoded hexes.
- **KPI Cards:** All cards use `text-heading-2 font-bold tabular-nums truncate` for the main figure, and `CardAction` uses `shrink-0` to prevent overlap on large numbers.
- **Tables:** All tables use `TableToolbar`, checkboxes for bulk selection, and shadcn `<Table>` primitives.
- **Exports:** All tables use `<ExportDropdown>` for global actions. When rows are selected, global Print/Export actions are intercepted by `<ExportConfirmDialog>` to clarify the scope (All vs Selected). The selection bar contains direct Export buttons that bypass the prompt.
- **Dialogs:** The base `<DialogHeader>` has `pr-12` to prevent title overlap with the close button. `<DialogTitle>` defaults to `text-heading-2` for forms/views, and explicitly overridden to `text-heading-3` for alerts.
- **Role Identity:** Universal Capability, Contextual Identity. All authorized roles can act, but SMS reflects sender ("National Office" vs "Regional Office").
- **Next.js 16:** Abandoned `export const instant = false`. All auth-protected routes require the universal `<Suspense>` wrapper and `await connection()` inside an async content component to resolve `cacheComponents` prerender errors.
- **Financial Ledger:** Cumulative lifetime calculation via `getExpectedUpToDate()`. Strict Bucket Isolation applies across all tables, KPIs, and SMS messages.
- **Audit Ledger:** Uses Static Global KPIs. The table below filters and searches, but the KPIs represent the total lifetime inflow for the user's role scope.
- **Sonner:** All user feedback (success, error, info) uses Sonner toasts. No `alert()`.
- **Allocation Engine:** Payment records remain immutable 1:1 bank ledger entries. Annual/Monthly attribution is handled purely via the `PaymentAllocation` table, allowing for mixed deposits and future prepayments without breaking reconciliation.

## Session Notes
- **Git Setup:** Remote origin is `https://github.com/gilbertmulahake-commits/maranatha-church-app.git`.
- **Browser Extension Warning:** Hydration mismatch occurs in normal browsers due to an extension injecting attributes (e.g., `data-qb-installed`). Harmless; use Incognito for development or add `suppressHydrationWarning` to `<html>`.
- **Stable Stack (Do Not Blindly Upgrade):** Next.js 16, Prisma 7, Tailwind v4, Base UI (shadcn). Dependency tree is clean (no Radix leakage). Do not run `npm update` without testing.
- **Layout Collapse Fix:** Flexbox `min-width: auto` caused cards to collapse. The enterprise fix is `min-w-0` on the layout wrapper. 
- **Tailwind Merge Quirk:** `tailwind-merge` will silently drop custom classes (like `text-heading-1`) if they conflict with standard classes (like `text-foreground`). We extended `twMerge` in `lib/utils.ts` to register all our custom Figma typography and spacing tokens. Do not remove this configuration.