# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase
Unit 14.6 - Complete

## Current Goal
Begin Unit 15: Deployment Preparation & Infrastructure Go-Live

## Completed
- **Unit 01: Database Initialization**
  - Configured Supabase (PostgreSQL) and Prisma ORM (`@prisma/prisma7`).
  - Created core schema: `Region`, `Church`, `Payment`, `RegionalScore`.
- **Unit 02: Authentication & Access Control**
  - Configured Supabase Auth (Client & Server components).
  - Implemented Next.js 16 `proxy.ts` for route protection.
  - Built Login UI with shadcn. Enforced initial RLS policies.
- **Unit 03: App Shell & UI Layout**
  - Built the Sidebar, Topbar, and App Shell wrapper.
  - Initialized shadcn/ui with Base UI (`render` prop).
- **Unit 04: Church Management (CRUD)**
  - Built Server Actions for Region and Church creation.
  - Built Create Region and Create Church dialogs.
- **Unit 05: Mock KCB Webhook & Payment Reconciliation**
  - Built the `/api/webhooks/kcb` route handler with Zod validation.
  - Implemented Idempotency check. Built Mock KCB Simulator UI.
- **Unit 06: National HQ Dashboard**
  - Integrated Recharts. Created initial KPI cards.
- **Unit 07: Regional Dashboards & Alerts**
  - Implemented role-based routing. Built Regional KPIs and compliance table.
  - Implemented strict RLS policies for data isolation.
- **Unit 08: SMS Integration & Hierarchy**
  - Built Mock SMS engine (`SmsLog` table). Integrated automated receipts.
  - Expanded Roles to a 6-role hierarchy. Built "Remind Pastor" button.
- **Unit 09: Financial Logic, Incentive Scoring & Design System**
  - Implemented Fair Compliance logic.
  - Built the Incentive Scoring Engine (40/30/20/10) and Leaderboard.
  - Mapped `globals.css` to semantic theme variables.
- **Unit 09.1: Enterprise Consistency & Polish**
  - Fixed `cn` utility, standardized KPI cards, implemented `TableToolbar`.
  - Adopted "Universal Capability, Contextual Identity" for SMS.
- **Unit 10.0: Financial Ledger Upgrade**
  - Added `billing_year Int`. Upgraded to cumulative lifetime calculation.
  - Implemented the Month/Year toggle in the `TableToolbar`.
- **Unit 10.1: Strict Bucket Isolation & Dynamic Statuses**
  - Enforced Strict Bucket Isolation. Implemented Dynamic Statuses.
  - Added `'N/A'` status for churches that owe 0 in a bucket.
- **Unit 10.2: Payments Tab (Audit Ledger)**
  - Built the transaction-level ledger with role-based isolation.
  - Implemented full data table with sorting, pagination, and filters.
- **Unit 11.1: Reporting UI (Arrears & Cashbook)**
  - Built `/dashboard/reports` with custom segmented toggle.
- **Unit 11.2: CSV Export Engine**
  - Created a generic `exportToCsv` utility.
- **Unit 12.1: User Profile & Settings**
  - Built the `/dashboard/settings` page with Profile Card and Password Update.
- **Unit 12.2: User Management (Admin)**
  - Added `/dashboard/users` route. Built `UsersTable` and `InviteUserDialog`.
- **Unit 13.1: Local Church Dashboard & RBAC**
  - Built dedicated Local Pastor dashboard with Strict Bucket Isolation.
- **Unit 13.2: National Dashboard Upgrade**
  - Transformed National Dashboard into a 12-column Command Center.
- **Unit 14.0: Prepaid Status UI**
  - Translated backend credit values into human-readable "Paid (X Years/Months Prepaid)" text.
- **Unit 14.5: Payment Allocation Engine (Enterprise Phase)**
  - Added `PaymentAllocation` model to track exact period-by-period attribution.
  - Built pure allocation engine using a Year-by-Year priority model.
  - Updated KCB Webhook to accept `Auto` mode, split payments using `createMany`.
  - Created and ran `scripts/backfill-allocations.ts`.
  - Refactored all 8 Server Action files to read from `allocations`.
  - Added "Mixed" badge and Allocation Breakdown modal.
- **Unit 14.6: Enterprise UI Polish & Consistency**
  - **Financial Logic:** Updated actions to calculate Gross Arrears per bucket.
  - **KPI Cards UI:** Swapped to `text-heading-2`. Added `truncate` and `shrink-0`.
  - **Mock KCB Layout:** Converted simulator to a 2-column grid with a Testing Guide.
  - **Harmonized Drill-Downs:** Replaced custom UIs with unified components.
  - **Sidebar:** Enforced strict RBAC. Implemented responsive Base UI `render` props.
  - **Tables:** Standardized ALL tables with `<TableToolbar>`, checkboxes, and bulk actions.
  - **Dialogs:** Standardized globally (`pr-12` close-button safety, `p-6` padding).
  - **Exports:** Built Enterprise Export Engine (CSV, Excel, PDF) with Print support.
  - **Export Interceptor:** Built the `ExportConfirmDialog` for "Selected Only" vs "All".
  - **Charts:** Replaced Payment Methods chart with Church Compliance Breakdown.
  - **twMerge Fix:** Extended `tailwind-merge` to recognize custom Figma typography tokens.

## In Progress
- None.

## Next Up
- **Unit 15: Deployment Preparation**
  - Add `Pastorate` model (nullable, dormant) and expand `User` bio-data.
  - Upgrade the `NavUser` dropdown to industry standard.
  - Vercel integration, production Supabase keys, `prisma migrate deploy`.
  - Live KCB API integration and Africa's Talking SMS API hookup.

## Open Questions
- **Pastorate Adoption:** The `Pastorate` model is reserved but dormant. The Ministry will decide after a few months of operation whether to activate this organizational layer.
- **Bank Preference:** The Ministry prefers Equity Bank over KCB. The V2 roadmap includes dual-bank support so either (or both) can be active.
- **Equity Jenga API:** The exact API credentials and payload format for Equity's IPN webhook are TBD.
- **Offline Remittance Handling:** How to handle payments made via cash, cheques, or direct bank transfers that bypass the webhook. Requires a manual entry UI for National HQ.
- **Internal Communication Channel:** Deferred to V2 (Unit 16). An enterprise-grade inbox for threaded messaging, presence (online/busy), and archival.

## Architecture Decisions
- **Pastorate Reserved:** A `Pastorate` model is added to the schema as a nullable foreign key on `Church`. It is excluded from all financial calculations and can be activated or removed without migrations.
- **Dynamic Fund Migration (V2):** The `PaymentType` enum will be migrated to a `Fund` table in V2. This enables admin-created payment categories without schema changes.
- **Dual-Bank Adapter Pattern (V2):** Webhook handlers for KCB and Equity will normalize their payloads into a single `NormalizedTransaction` shape, fed into a unified Reconciliation Engine.
- **Design System:** Strict use of semantic tokens defined in `globals.css`. No hardcoded hexes.
- **KPI Cards:** All cards use `text-heading-2 font-bold tabular-nums truncate` for the main figure, and `CardAction` uses `shrink-0` to prevent overlap.
- **Tables:** All tables use `TableToolbar`, checkboxes for bulk selection, and shadcn `<Table>` primitives.
- **Exports:** All tables use `<ExportDropdown>`. Global Print/Export actions are intercepted by `<ExportConfirmDialog>` to clarify the scope.
- **Dialogs:** The base `<DialogHeader>` has `pr-12` to prevent title overlap. `<DialogTitle>` defaults to `text-heading-2` for forms, and `text-heading-3` for alerts.
- **Next.js 16:** All auth-protected routes require the universal `<Suspense>` wrapper and `await connection()` inside an async content component.
- **Financial Ledger:** Cumulative lifetime calculation via `getExpectedUpToDate()`. Strict Bucket Isolation applies across all tables, KPIs, and SMS messages.
- **Allocation Engine:** Payment records remain immutable 1:1 bank ledger entries. Attribution is handled purely via the `PaymentAllocation` table.

## Session Notes
- **Git Setup:** Remote origin is `https://github.com/gilbertmulahake-commits/maranatha-church-app.git`.
- **Browser Extension Warning:** Hydration mismatch occurs in normal browsers due to an extension injecting attributes. Harmless; use Incognito for development or add `suppressHydrationWarning` to `<html>`.
- **Stable Stack (Do Not Blindly Upgrade):** Next.js 16, Prisma 7, Tailwind v4, Base UI (shadcn). Do not run `npm update` without testing.
- **Layout Collapse Fix:** Flexbox `min-width: auto` caused cards to collapse. The enterprise fix is `min-w-0` on the layout wrapper. 
- **Tailwind Merge Quirk:** `tailwind-merge` will silently drop custom classes (like `text-heading-1`) if they conflict with standard classes (like `text-foreground`). We extended `twMerge` in `lib/utils.ts` to register all our custom Figma typography and spacing tokens. Do not remove this configuration.