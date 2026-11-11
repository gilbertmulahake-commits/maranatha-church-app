# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase
Unit 15 Phase 1 - Complete

## Current Goal
Begin Unit 15 Phase 2: Environment & Deployment Readiness

## Completed
- **Unit 01: Database Initialization** — Supabase + Prisma ORM (`@prisma/prisma7`). Schema: `Region`, `Church`, `Payment`, `RegionalScore`.
- **Unit 02: Authentication & Access Control** — Supabase Auth, `proxy.ts` route protection, Login UI with shadcn. RLS policies.
- **Unit 03: App Shell & UI Layout** — Sidebar, Topbar, App Shell wrapper. shadcn/ui with Base UI (`render` prop).
- **Unit 04: Church Management (CRUD)** — Server Actions for Region & Church creation. Create dialogs.
- **Unit 05: Mock KCB Webhook & Payment Reconciliation** — `/api/webhooks/kcb` with Zod validation + idempotency. Mock KCB Simulator UI.
- **Unit 06: National HQ Dashboard** — Recharts + KPI cards.
- **Unit 07: Regional Dashboards & Alerts** — Role-based routing. Strict RLS data isolation.
- **Unit 08: SMS Integration & Hierarchy** — Mock SMS engine (`SmsLog`). 6-role hierarchy. "Remind Pastor" button.
- **Unit 09: Financial Logic, Incentive Scoring & Design System** — Fair Compliance logic. Incentive Scoring Engine (40/30/20/10). Semantic theme variables.
- **Unit 09.1: Enterprise Consistency & Polish** — `cn` utility, standardized KPI cards, `TableToolbar`. Universal Capability, Contextual Identity for SMS.
- **Unit 10.0: Financial Ledger Upgrade** — `billing_year Int`. Cumulative lifetime calculation. Month/Year toggle.
- **Unit 10.1: Strict Bucket Isolation & Dynamic Statuses** — Enforced. Added `'N/A'` status.
- **Unit 10.2: Payments Tab (Audit Ledger)** — Transaction-level ledger with role-based isolation. Full data table with filters.
- **Unit 11.1: Reporting UI** — `/dashboard/reports` with custom segmented toggle.
- **Unit 11.2: CSV Export Engine** — Generic `exportToCsv` utility.
- **Unit 12.1: User Profile & Settings** — `/dashboard/settings` with Profile Card & Password Update.
- **Unit 12.2: User Management (Admin)** — `/dashboard/users`, `UsersTable`, `InviteUserDialog`.
- **Unit 13.1: Local Church Dashboard & RBAC** — Dedicated Local Pastor dashboard with Strict Bucket Isolation.
- **Unit 13.2: National Dashboard Upgrade** — 12-column Command Center.
- **Unit 14.0: Prepaid Status UI** — Human-readable "Paid (X Years/Months Prepaid)".
- **Unit 14.5: Payment Allocation Engine** — `PaymentAllocation` model. Pure allocation engine (Year-by-Year FIFO). KCB webhook accepts `Auto` mode. Backfill script. Refactored all 8 Server Actions. "Mixed" badge + Allocation Breakdown modal.
- **Unit 14.6: Enterprise UI Polish & Consistency** — Gross Arrears per bucket. `text-heading-2` KPI cards. Mock KCB 2-column grid. Harmonized Drill-Downs. RBAC Sidebar. All tables with `<TableToolbar>` + checkboxes + bulk actions. Standardized dialogs (`pr-12`, `p-6`). Enterprise Export Engine (CSV, Excel, PDF). `ExportConfirmDialog`. `twMerge` fix.
- **Unit 15 Phase 1: Schema Expansion & Migration Baseline Repair**
  - **Migration history repaired** — added `00000000000000_baseline` migration to reconcile local `prisma/migrations/` with the remote database (which had 2 orphan migration records).
  - **`Pastorate` model added** — nullable, dormant. `Church.pastorate_id` FK. `Region.pastorates Pastorate[]` back-relation.
  - **`Church` profile fields added** — `physical_address`, `membership_count`.
  - **`User` bio-data added** — `first_name`, `last_name`, `phone`, `profile_photo_url`, `bio`.
  - **Migration:** `20261111072851_add_pastorate_and_biodata` applied cleanly.
  - **Lint cleanup:** 12 pre-existing ESLint errors resolved (`any` types, unused imports, unescaped entities). `use-mobile.ts` refactored to `useSyncExternalStore`. `sendBulkReminders` simplified to 2-arg signature.
  - **Backup:** `backup_before_baseline.sql` (309 KB) saved to `%USERPROFILE%\Desktop\mfa-backup\`.
  - **Verified:** 11 churches, 15 payments, 4 regions preserved. Zero data loss.
- **Unit 15 Phase 2: Environment & Deployment Readiness**
  - Added `.env.example` (committed canonical template) and `.env.production.example` (production template).
  - Updated `.gitignore` to allow committing both templates while continuing to ignore `.env` and `.env.production`.
- **Unit 15 Phase 3: Bank Adapter Engine**
  - Created `lib/utils/bank-adapter.ts` with the `NormalizedTransaction` interface.
  - `normalizeKcbPayload(payload: unknown)` and `normalizeEquityPayload(payload: unknown)` — both validate structure, extract `bank_reference`, `church_code`, `amount`, `currency`, `payment_method`, and `transaction_date`, and return a standardized shape.
  - Church codes are normalized (uppercase + trimmed). Amounts are parsed from strings/numbers and rejected if `NaN`. Invalid payloads throw descriptive errors.
  - No `any` types — strict validation via `unknown` narrowing.
- **Unit 15 Phase 4: Africa's Talking Live Integration**
  - Replaced mock-only `sendSms()` with a dual-path implementation: production calls the real Africa's Talking REST API, development retains the console-log mock.
  - Added `normalizeKenyanPhone()` helper: converts `0723...`, `254723...`, `+254723...`, and bare `723...` to E.164 (`+254723...`). Required by AT; without it, every production SMS is silently rejected.
  - Added `AFRICASTALKING_API_URL` env var (defaults to production endpoint) so sandbox testing works via config override — no code changes needed for UAT.
  - Extracted `safeLogSms()` helper: writes to `SmsLog` but **never throws**. If the log write fails after a successful SMS send, `sendSms()` still returns `{ success: true }` to prevent the UI from triggering a retry (which would send a duplicate SMS).
  - Production failures (HTTP errors, AT rejections, fetch exceptions) log `SmsLog.status = 'Failed'` for a full audit trail.
  - `sendReminder`, `sendChairmanReminder`, `sendBulkReminders` function signatures unchanged — no caller updates required.

## In Progress
- None.

## Next Up
- **Unit 15 Phase 5: Profile UI Upgrade**
  - Update `components/layout/nav-user.tsx` to show Avatar (initials-based), full name, and role badge.
  - Add "My Profile" link to `/dashboard/settings`.
  - (Optional) Build `/dashboard/profile` page for editing bio-data (`first_name`, `last_name`, `phone`, `profile_photo_url`, `bio`).

## Open Questions
- **Pastorate Adoption:** The `Pastorate` model is reserved but dormant. The Ministry will decide after a few months of operation whether to activate this organizational layer.
- **Bank Preference:** The Ministry prefers Equity Bank over KCB. The V2 roadmap includes dual-bank support so either (or both) can be active.
- **Equity Jenga API:** The exact API credentials and payload format for Equity's IPN webhook are TBD.
- **Offline Remittance Handling:** How to handle payments made via cash, cheques, or direct bank transfers that bypass the webhook. Requires a manual entry UI for National HQ.
- **Internal Communication Channel:** Deferred to V2 (Unit 16). An enterprise-grade inbox for threaded messaging, presence, and archival.

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
- **Migration Baseline Repair (Unit 15 Phase 1):** The remote DB had 2 orphan `_prisma_migrations` records (`init`, `add_user_model`) with no corresponding local files. Repaired by (1) backing up via `pg_dump`, (2) clearing `_prisma_migrations`, (3) generating a fresh baseline migration from the current schema, and (4) marking it applied. Going forward: **no `db push`, no `migrate reset` on real data, commit all migrations, backup before any destructive operation.**
- **Migration Baseline (`00000000000000_baseline`):** Represents the entire pre-Unit-15 schema. Any new changes must be additive migrations on top of this baseline. Do not delete or modify this folder.

## Session Notes
- **Git Setup:** Remote origin is `https://github.com/gilbertmulahake-commits/maranatha-church-app.git`.
- **Browser Extension Warning:** Hydration mismatch occurs in normal browsers due to an extension injecting attributes. Harmless; use Incognito for development or add `suppressHydrationWarning` to `<html>`.
- **Stable Stack (Do Not Blindly Upgrade):** Next.js 16, Prisma 7, Tailwind v4, Base UI (shadcn). Do not run `npm update` without testing.
- **Layout Collapse Fix:** Flexbox `min-width: auto` caused cards to collapse. The enterprise fix is `min-w-0` on the layout wrapper.
- **Tailwind Merge Quirk:** `tailwind-merge` will silently drop custom classes (like `text-heading-1`) if they conflict with standard classes (like `text-foreground`). We extended `twMerge` in `lib/utils.ts` to register all our custom Figma typography and spacing tokens. Do not remove this configuration.
- **Supabase Free Plan Backups:** No scheduled backups available. Use `pg_dump` locally before any destructive operation:
  ```cmd
  pg_dump "postgresql://postgres:<password>@<host>:5432/postgres" --no-owner --no-acl --format=plain --file=backup_<date>.sql
  ```
  Move dumps outside the repo. Confirm `.gitignore` excludes `*.sql`.
- **ESLint `argsIgnorePattern` Gap:** The current ESLint config does NOT set `argsIgnorePattern`, so underscore-prefixed unused parameters (e.g., `_options`) are still flagged. Use `void` to mark intentionally unused parameters, or remove the parameter.
- **`use-mobile.ts` Refactor:** Refactored from `useEffect` + `setState` to `useSyncExternalStore` to satisfy `react-hooks/set-state-in-effect`. Do not revert.
- **`sendBulkReminders` Signature:** Now takes exactly 2 arguments — `(recipients, senderRole)`. Do NOT reintroduce `periodView`.
- **Prisma 7 CLI Syntax:** `migrate diff` uses `--to-schema` (not `--to-schema-datamodel`). Older Prisma tutorials may reference the old flag.
- **`lib/utils.ts` twMerge Expansion:** During Phase 1 lint cleanup, the `twMerge` config in `lib/utils.ts` was expanded to register the full spacing scale across all directions (`pt`, `pb`, `pl`, `pr`, `mx`, `my`, `ml`, `mr`, `gap-x`, `gap-y`) using a shared `SPACING_SCALE` constant. This was **not** a reset — the protected `extendTailwindMerge` block is intact. Do not revert. Prevents silent class-drop bugs in components using directional spacing tokens.
- **Next.js Env Precedence:** Next.js loads `.env.production` automatically during `npm run build` with priority over `.env`. Having `.env.production` locally with empty values breaks builds (missing Supabase keys cause `/login` prerender errors). Convention: keep only `.env.production.example` locally; create the real `.env.production` exclusively on Vercel's server environment.
- **Africa's Talking Endpoint Config:** `AFRICASTALKING_API_URL` defaults to production (`https://api.africastalking.com/version1/messaging`). For sandbox testing, override with `https://api.sandbox.africastalking.com/version1/messaging`. `.env.production.example` pre-sets the sandbox URL as a safe default — never accidentally bill live SMS credits during UAT.
- **SMS Duplicate-Prevention:** `safeLogSms()` swallows `SmsLog` write failures so a successful AT send always returns `{ success: true }`. If you ever refactor `sendSms()`, preserve this invariant: **DB log failure must not surface as SMS-send failure** — otherwise UI retries cause duplicate messages.
- **Africa's Talking Phone Format:** AT requires E.164 (`+254XXXXXXXXX`). The DB stores local format (`0XXXXXXXXX`). `normalizeKenyanPhone()` handles the conversion — never call the AT API with a raw DB phone value.