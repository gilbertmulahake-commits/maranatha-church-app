# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase
Post-MVP — Phase 4 (Post-Deployment Enhancements).

## Current Goal
Unit 15i — TableToolbar `<Select>` standardization (swap native HTML `<select>` for shadcn `<Select>` in all 7 tables).

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
- **Unit 15 Phase 5: Profile UI Upgrade**
  - Upgraded `components/layout/nav-user.tsx` to display the user's avatar (with initials fallback), full name, email, and a **Role Badge** (e.g., "National Treasurer").
  - Added a **"My Profile"** action link that routes directly to `/dashboard/settings`.
  - Passed the authenticated user's `role` from `components/layout/app-sidebar.tsx` down to `NavUser`, defaulting to `CHURCH_TREASURER` if null to satisfy TypeScript.
- **Unit 15: Deployment Execution (Vercel + Supabase Production)**
  - Deployed app to Vercel production environment.
  - Wired up all environment variables (Supabase Production DB, AT Sandbox, etc.).
  - Ran `npx prisma7 migrate deploy` to push local migrations to the live Supabase database.
  - Fixed AT Sandbox `404 InvalidSenderId` by removing the literal `from: 'sandbox'` parameter (AT default shortcode is used instead).
- **Post-MVP: Dashboard Reconciliation (merged)**
  - `lib/actions/scoring-actions.ts` — rewrote `getRegionalScores` compliance calculation to use **Strict Bucket Isolation** (matches National KPI definition). Was previously using aggregate `totalPaid >= totalExpected`, causing the Regional Leaderboard to over-count compliant churches.
  - `components/dashboard/kpi-cards.tsx` — badge changed `YTD` → `All Time` on Total Collected card (the number is lifetime, label was misleading).
  - Removed rogue `cn` npm package (legacy artifact causing 6 shadcn primitives to fail: `button`, `calendar`, `label`, `popover`, `progress`, `select`). All 6 fixed to import from `@/lib/utils`.
  - Removed unused `@tanstack/react-table`.
- **Post-MVP: Net Credit Label (merged)**
  - `kpi-cards.tsx` — `Network Net Credit` → `All-Time Net Credit`. The 10,500 KES discrepancy vs the YTD hero card is because the KPI card uses lifetime (2025+2026) while the hero uses YTD. Both correct; label now clarifies.
- **Post-MVP: Region Edit Action (merged)**
  - `components/regions/region-table.tsx` — "Edit Region" menu item was a dead button (no `onClick`). Wired up `EditRegionDialog` with `regionToEdit` state.
- **Post-MVP: Responsive Toolbar (PR #29, merged)**
  - `components/ui/table-toolbar.tsx` — full refactor:
    - Search bar `md:w-[300px]` fixed on desktop, `w-full` on mobile (fixes collapse-to-icon bug).
    - Period toggle: Base UI `<Select>` on mobile, `<Button>` group on desktop (`md:hidden` / `hidden md:flex` pattern).
    - Print and Export buttons: icon-only below `lg`, full text at `lg+`.
  - All 7 tables updated with icon-only Print button in `filterSlot`.
- **Post-MVP: Responsive Shadcn Pattern (PR #30, merged)**
  - `app/dashboard/layout.tsx` — added `mx-auto max-w-[1440px]` (prevents 4K stretch) + `@container/main` (enables sidebar-aware container queries).
  - 15 KPI grids moved to `@[600px]:grid-cols-2` (2-col max at that point — since revised, see below).
  - KPI density tuned: `p-4` headers/footers, `text-xs` labels, `text-[11px]` footers.
- **Post-MVP: KPI System Extraction (commit 434083e, merged)**
  - **`components/ui/kpi-grid.tsx`** (new) — 3-tier responsive grid: 1 col < 600px container, 2 cols 600–1100px, 4 cols > 1100px. Requires `@container` ancestor.
  - **`components/ui/kpi-value.tsx`** (new) — 3-tier responsive typography: `heading-3` base, `@[300px]/card:heading-2`, `@[420px]/card:heading-1`. Preserves `tabular-nums`, `font-bold`, `truncate`, `mt-1`. Color via `className`.
  - **15 files migrated** — 7 KPI components + 8 page Suspense skeleton files.
  - **`context/ui-context.md`** — Section 5 rewritten with `<KpiGrid>` / `<KpiValue>` standard; forbidden inline-grid example added; breakpoint documented as `1100px`.
  - **Verification:** `tsc --noEmit` clean, `lint` clean, `build` 18/18 pages, all `findstr` checks pass.
- **Post-MVP: 7-Table Migration (Phase 3.5 / Unit 15h, branch `refactor/table-migration`, commit `80551c7`)**
  - All 7 data tables migrated to `<TableShell>` + `<PrintButton>`: `church-table.tsx`, `payments-table.tsx`, `region-table.tsx`, `regional-table.tsx`, `arrears-table.tsx`, `cashbook-table.tsx`, `local-payment-history.tsx`.
  - **Root-cause fix:** every table previously wrapped the shadcn `<Table>` in `<div className="... overflow-hidden">`. The `overflow-hidden` silently **clipped columns on tablet/mobile** with no horizontal scroll — a real user-facing data-loss bug on 9-column tables. `<TableShell>` uses `overflow-x-auto`.
  - **Cleanup:** removed `Printer` from `lucide-react` imports (all 7 files); removed `Table` from shadcn imports (all 7 files); removed unused `Button` import from `payments-table.tsx` and `local-payment-history.tsx`.
  - **Preserved:** `TableFooter` (grand-total / daily-total rows) kept **inside** `<TableShell>` in `arrears-table.tsx` and `cashbook-table.tsx`; `overflow-hidden` on `region-table.tsx` compliance progress pill (correct usage — not a table wrapper).
  - **Verification:** `tsc --noEmit` clean, `lint` 0 problems, `build` 18/18 pages, per-file `findstr` gate passed on all 7 files.
- **Unit 15.6: SYSTEM_ADMIN Role & Protected Accounts (Blocking Pre-UAT)**
  - Added `SYSTEM_ADMIN` to Prisma `Role` enum. Migration applied (`20261114060838_add_system_admin_role`). Data verified intact (11 churches, 16 payments, 4 regions).
  - Created centralized RBAC helpers (`lib/auth/roles.ts`) and `PROTECTED_USER_IDS` (`lib/auth/protected-users.ts`).
  - Enforced protection in `user-actions.ts` (`getSystemUsers` filters protected IDs unless viewer is SYSTEM_ADMIN; `inviteUser` blocks SYSTEM_ADMIN creation).
  - Fixed routing bug: replaced `role.includes('NATIONAL')` with `isNationalLevel()` so SYSTEM_ADMIN can access `/dashboard/users` and full sidebar.
  - Manually provisioned Vendor account (`gilbertmulahake.ke@gmail.com`) via Supabase Auth and Prisma DB. Hardcoded UUID to `PROTECTED_USER_IDS`. **Client handover unblocked.**

## In Progress
- None.

## Next Up
- **Unit 15i: TableToolbar `<Select>` standardization** — Swap native HTML `<select>` in the 7 tables for shadcn `<Select>`.
- **Then:** 15.7 → 15.8/15.9 → 16.x → 17 → 18 → 19 → 20/21 → polish (see `context/specs/00-build-plan.md`).

## Open Questions
- **Pastorate Adoption:** The `Pastorate` model is reserved but dormant. The Ministry will decide after a few months of operation whether to activate this organizational layer.
- **Bank Preference:** The Ministry prefers Equity Bank over KCB. The V2 roadmap includes dual-bank support so either (or both) can be active.
- **Equity Jenga API:** The exact API credentials and payload format for Equity's IPN webhook are TBD.
- **Offline Remittance Handling:** How to handle payments made via cash, cheques, or direct bank transfers that bypass the webhook. Requires a manual entry UI for National HQ. (Addressed in Unit 17).

## Architecture Decisions
- **KPI Grid — `<KpiGrid>`:** All KPI rows wrap in `<KpiGrid>` from `components/ui/kpi-grid.tsx`. Never inline `grid grid-cols-*` for a KPI row. 3-tier: 1 col < 600px container, 2 cols 600–1100px, 4 cols > 1100px. To change the standard, edit the component — one file, not 15.
- **KPI Value — `<KpiValue>`:** All KPI numbers use `<KpiValue>` from `components/ui/kpi-value.tsx`. Never inline `text-heading-*` or `truncate` on a KPI number. Color via `className` (e.g., `<KpiValue className="text-destructive">`). 3-tier font: `heading-3` base → `heading-2` at 300px → `heading-1` at 420px.
- **Table Toolbar — `<TableToolbar>`:** All tables use the shared toolbar (search `md:w-[300px]` on desktop / `w-full` on mobile, Base UI `<Select>` period toggle on mobile, icon-only Print/Export below `lg`).
- **Container Queries:** `app/dashboard/layout.tsx` provides `@container/main`. KPI grids and cards respond to container width, not viewport width — sidebar state irrelevant to card layout.
- **SYSTEM_ADMIN Role:** Reserved for vendor/platform owner. Protected via hardcoded allowlist in `lib/auth/protected-users.ts`. Cannot be deleted/deactivated by client's National Treasurer. Hidden from Users list unless viewer is also SYSTEM_ADMIN. Centralized RBAC in `lib/auth/roles.ts`.
- **Post-deployment backlog structured into** table extraction (15h ✅) → 15.6 ✅ → 15i → 15.7 → 15.8/15.9 → 16.x → 17 → 18 → 19 → 20/21 → polish.
- **Pastorate Reserved:** A `Pastorate` model is added to the schema as a nullable foreign key on `Church`. Excluded from all financial calculations. Can be activated or removed without migrations.
- **Dynamic Fund Migration (V2):** The `PaymentType` enum will be migrated to a `Fund` table in V2. Enables admin-created payment categories without schema changes.
- **Dual-Bank Adapter Pattern (V2):** Webhook handlers for KCB and Equity will normalize their payloads into a single `NormalizedTransaction` shape, fed into a unified Reconciliation Engine.
- **Design System:** Strict use of semantic tokens defined in `globals.css`. No hardcoded hexes. Custom Figma tokens protected by `twMerge` extension in `lib/utils.ts`.
- **Tables:** All 8 tables (7 data + Users) use `<TableToolbar>`, `<TableShell>`, checkboxes for bulk selection, and shadcn `<Table>` primitives. `<TableShell>` (`components/ui/table-shell.tsx`) owns the card frame and uses `overflow-x-auto` so wide tables scroll horizontally instead of clipping columns (fixes the real `overflow-hidden` column-clipping bug — PR #33 / Unit 15h).
- **Print/Export Buttons:** All tables use `<PrintButton>` (icon-only below `lg`, custom `children` for non-default labels) and `<ExportDropdown>` (icon-only below `lg`).
- **TableToolbar `<Select>` Standardization (Unit 15i, planned):** Filter and Sort dropdowns in the 7 tables currently use **native HTML `<select>`** with Tailwind styling, not shadcn `<Select>`. Pre-existing inconsistency (present on `main` before 15h). Deferred to its own unit to keep 15h a pure wrapper migration — a shadcn `<Select>` swap requires controlled-state rewrites (`onChange` → `onValueChange`) and per-file QA across 7 files.
- **Exports:** All tables use `<ExportDropdown>`. Global Print/Export actions intercepted by `<ExportConfirmDialog>` to clarify scope.
- **Dialogs:** Base `<DialogHeader>` has `pr-12` to prevent title overlap. `<DialogTitle>` defaults to `text-heading-2` for forms, `text-heading-3` for alerts.
- **Next.js 16:** All auth-protected routes require the universal `<Suspense>` wrapper and `await connection()` inside an async content component.
- **Financial Ledger:** Cumulative lifetime calculation via `getExpectedUpToDate()`. Strict Bucket Isolation applies across all tables, KPIs, and SMS messages.
- **Allocation Engine:** Payment records remain immutable 1:1 bank ledger entries. Attribution handled purely via the `PaymentAllocation` table.
- **Migration Baseline Repair (Unit 15 Phase 1):** The remote DB had 2 orphan `_prisma_migrations` records (`init`, `add_user_model`) with no corresponding local files. Repaired by (1) backing up via `pg_dump`, (2) clearing `_prisma_migrations`, (3) generating a fresh baseline migration from the current schema, and (4) marking it applied. Going forward: **no `db push`, no `migrate reset` on real data, commit all migrations, backup before any destructive operation.**
- **Migration Baseline (`00000000000000_baseline`):** Represents the entire pre-Unit-15 schema. Any new changes must be additive migrations on top of this baseline. Do not delete or modify this folder.

## Session Notes
- **Current HEAD:** `4824431` on `main` (Vendor UUID protected).
- **KCB and Equity APIs are still mocked.** Real sandbox integration pending client credential acquisition.
- **Africa's Talking is in sandbox mode.** Sandbox URL is configured via `AFRICASTALKING_API_URL` env var.
- **Vendor (me) will have a SYSTEM_ADMIN account** (`gilbertmulahake.ke@gmail.com`, UUID `86f0852b-23f2-4a32-a478-4e7b96f792d7`) that is invisible and immutable to the client's National Treasurer.
- **Git Setup:** Remote origin is `https://github.com/gilbertmulahake-commits/maranatha-church-app.git`.
- **Deployed on Vercel.** Production URL active. `prisma7 migrate deploy` has been run against production Supabase.
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
- **`lib/utils.ts` twMerge Expansion:** The `twMerge` config in `lib/utils.ts` registers the full spacing scale across all directions (`pt`, `pb`, `pl`, `pr`, `mx`, `my`, `ml`, `mr`, `gap-x`, `gap-y`) using a shared `SPACING_SCALE` constant. This was **not** a reset — the protected `extendTailwindMerge` block is intact. Do not revert.
- **Next.js Env Precedence:** Next.js loads `.env.production` automatically during `npm run build` with priority over `.env`. Having `.env.production` locally with empty values breaks builds (missing Supabase keys cause `/login` prerender errors). Convention: keep only `.env.production.example` locally; create the real `.env.production` exclusively on Vercel's server environment.
- **Africa's Talking Endpoint Config:** `AFRICASTALKING_API_URL` defaults to production (`https://api.africastalking.com/version1/messaging`). For sandbox testing, override with `https://api.sandbox.africastalking.com/version1/messaging`. `.env.production.example` pre-sets the sandbox URL as a safe default — never accidentally bill live SMS credits during UAT.
- **SMS Duplicate-Prevention:** `safeLogSms()` swallows `SmsLog` write failures so a successful AT send always returns `{ success: true }`. If you ever refactor `sendSms()`, preserve this invariant: **DB log failure must not surface as SMS-send failure** — otherwise UI retries cause duplicate messages.
- **Africa's Talking Phone Format:** AT requires E.164 (`+254XXXXXXXXX`). The DB stores local format (`0XXXXXXXXX`). `normalizeKenyanPhone()` handles the conversion — never call the AT API with a raw DB phone value.
- **Windows CMD `findstr` Quirk:** `findstr /S /C:"x" file1.tsx file2.tsx` with explicit file lists is unreliable — only processes the first path. Use directory wildcards (`findstr /S /C:"x" components\*.tsx`). Also: `findstr` without `/C:` treats spaces as OR separators, not literal. Always use `/C:"literal string"`.
- **Git Pager Hang:** `git diff` and `git diff --stat` on large outputs trigger `less` pager. Use `git --no-pager diff` or press `q` to exit.
- **File Encoding Mojibake:** Pasted file content sometimes shows `тАФ` instead of `—` or `ÔÇö` instead of `—`. Fix by saving with UTF-8 encoding in VS Code (bottom-right status bar → "Save with Encoding" → UTF-8).
- **Container Query Requirement:** `@[Xpx]:` Tailwind arbitrary variants require `@container` on a nearest ancestor. Without it, they act like viewport width (wrong). `app/dashboard/layout.tsx` provides `@container/main`; KPI cards also have `@container/card` on the card wrapper for their own font tiers.
- **Component Extraction Discipline:** When 3+ files share a pattern, extract a component before editing them. Completed extractions: `<TableToolbar>`, `<ExportDropdown>`, `<DataTablePagination>`, `<ExportConfirmDialog>`, `<KpiGrid>`, `<KpiValue>`, `<TableShell>`, `<PrintButton>`. Pending: shadcn `<Select>` swap for TableToolbar filter/sort dropdowns (Unit 15i).
- **One File at a Time:** When migrating shared components, migrate one consumer per message, verify per file (findstr + build), then proceed. Prevents "15-file sweep" debt.
- **Verification Gate (Pre-Commit):** Always run `npx tsc --noEmit`, `npm run lint`, `npm run build` before committing. Never commit with failing tests. Zero exceptions.
```