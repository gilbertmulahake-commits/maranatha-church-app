# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase
Post-MVP — Phase 4 (Post-Deployment Enhancements).

## Current Goal
- **Unit 18.2.2a: Arrears Aging — Drillable** — ✅ COMPLETE and MERGED (PR #53, merge commit `c9b05b2`). See `## Completed`.
- **Next unit:** **18.2.2b** (Prepayment / Credit Position rollup) — read-only, no schema change, no product input required. **18.2.1 is DEFERRED** pending client clarification of the three score axes (see `## Open Questions`).

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
  - `components/dashboard/kpi-cards.tsx` — badge changed `YTD` → `All time` on Total Collected card (the number is lifetime, label was misleading).
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
- **Post-MVP: 7-Table Migration (Phase 3.5 / Unit 15h, PR #34, commit `80551c7`)**
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
  - Manually provisioned Vendor account (`gilbertmulahake.ke@gmail.com`, UUID `86f0852b-23f2-4a32-a478-4e7b96f792d7`) via Supabase Auth and Prisma DB. Hardcoded UUID to `PROTECTED_USER_IDS`. **Client handover unblocked.**
- **Unit 15i: TableToolbar `<Select>` Standardization (PR #36, commit `7261132`)**
  - Replaced all native HTML `<select>` elements in the 5 affected tables with shadcn `<Select>` (Base UI variant).
  - Files: `church-table.tsx`, `payments-table.tsx`, `region-table.tsx`, `regional-table.tsx`, `local-payment-history.tsx`.
  - Migrated `onChange={(e) => ...}` → `onValueChange={(val) => ...}`. Kept `h-9 w-full bg-card text-xs` styling on `<SelectTrigger>`.
  - Fixed Base UI nullable type signatures: widened `handleStatusFilterChange` in `local-payment-history.tsx` to `string | null`; added `if (val)` guards in `region-table.tsx` and `regional-table.tsx`.
  - **Verification:** `tsc --noEmit` clean, `lint` 0 problems, `build` 18/18 pages.
- **Unit 15.7: Critical Bug Fixes & Mobile Responsiveness (PR #37, commit `32410f3`)**
  - **Logout loading state:** Added `isLoggingOut` spinner + disabled state to `nav-user.tsx` (Sidebar) and `topbar.tsx` (Topbar).
  - **"Mixed" badge tooltip:** Fixed collapsing vertical text and inverted arrow. `components/ui/tooltip.tsx` now uses `w-max !min-w-max whitespace-normal break-words max-w-[300px]` + removed hardcoded `translate-y` on arrow + added `instant-open` animations.
  - **Login page mobile stacking:** Added `px-4 py-12` container padding + migrated native inputs to shadcn `<Input>`, `<Label>`, `<Button>`.
  - **Auth Router Cache bug:** Replaced `router.push()` with `window.location.replace()` on login and logout — this clears the Next.js Router Cache to prevent stale credentials and "Signing in..." ghost states.
  - **Table toolbar mobile:** Replaced the final legacy native `<select>` fallback in `table-toolbar.tsx` with shadcn `<Select>`.
  - **Sidebar auto-hide (mobile):** Added `usePathname` effect in `sidebar.tsx` — the mobile sheet closes automatically on route change.
  - **Sidebar minimize toggle (desktop):** Reverted an incorrect tooltip-wrapper change in `sidebar.tsx` that caused a Base UI runtime crash. Standard shadcn behavior confirmed working.
  - **Verification:** `tsc --noEmit` clean, `lint` 0 problems, `build` 18/18 pages.
- **Unit 15.8 & 15.9: Dashboard Experience Polish & Mini Tables (Architecture Blueprint Completed)**
  - Rather than building the old Dashboard V1 layout, we completely re-architected the dashboard into an **Executive Command Center (V2)**.
  - Defined the 4-Tier Layout: Command Bar (Hero + Action Center), Bucket Health (Annual KPI, Monthly KPI, Compliance Snapshot), Analytics (Arrears Aging replacing Doughnut), and Accountability (Enhanced Leaderboard).
  - Created the `DashboardView` Client Component to manage the unified `range` state (`week | month | year | all`).
  - Updated `dashboard-actions.ts` to pre-compute weekly, monthly, yearly, and all-time collection data.
- **Unit 15.10: Executive Command Center (Dashboard V2) — COMPLETE (this session)**
  - **Tier 1 Command Bar:** Hero KPI tracks Expected-to-Date (not year-end target), so the progress bar shows "Ahead of schedule" accurately. New `ActionCenter.tsx` component with arrears breakdown + direct "Send Reminders" CTA.
  - **Tier 2 Bucket Health (3 KPI cards):** Annual Bucket (5,000/yr isolated), Monthly Bucket (500/mo isolated), Compliance Snapshot (raw counts Paid/Partial/Overdue/N/A — no misleading %). Dropped the redundant "This Period" card.
  - **Tier 3 Analytics:** Replaced Doughnut with `ArrearsAging.tsx` (0-30, 31-60, 61-90, 90+ day buckets with escalation warning at 90+>25%).
  - **Tier 4 Accountability:** Leaderboard now on the left (7 cols) with a new **Arrears** column. Live Feed on the right (5 cols). Row actions replaced `<Link>` with a `<Button>` that opens `RegionBreakdownDialog` (rank, compliance bar, arrears split, score, tier + "View Region Page" CTA). Modal width fixed by matching `create-church-dialog` pattern (`sm:max-w-[500px] min-w-[320px]`).
  - **Data Layer:** `dashboard-actions.ts` now returns `aging0_30`, `aging31_60`, `aging61_90`, `aging90_plus`, `totalCollectedThisWeek`, and `allTimeCollections`. `scoring-actions.ts` now returns `outstandingAmount`, `outstandingAnnual`, `outstandingMonthly` per region.
  - **Global Range Toggle:** Lifted to `dashboard-view.tsx` header (Week / Month / Year / All Time). Drives the Hero card, KPI cards, and chart simultaneously. Container queries (`@[Xpx]/dashboard`) keep it responsive across all 8 states.
  - **Architecture:** Split `app/dashboard/page.tsx` (pure Server Component) from `components/dashboard/dashboard-view.tsx` (Client Component holding `range` state) to satisfy the Server/Client boundary.
- **Unit 16.1: Password Reset & Email Verification**
  - Implemented full "Forgot Password" flow (`/login/forgot-password`).
  - Implemented password update page (`/login/update-password`).
  - **Critical Fix:** Switched from PKCE `?code=` flow to Supabase `token_hash` verification. Updated Supabase email template to use `{{ .TokenHash }}` to prevent Next.js SSR cookie/session race conditions. Flow verified end-to-end.
  - **Infrastructure:** Configured Resend SMTP in Supabase to bypass Free Tier rate limits for UAT.
- **Unit 16.2: User Lifecycle Management**
  - Added `is_active` (soft delete) and `requires_password_reset` to `User` model.
  - Enforced inactive user blocking in `app/dashboard/layout.tsx` (`redirect('/login?error=account_disabled')`).
  - Enforced forced password reset in `app/dashboard/layout.tsx` (`redirect('/force-password-reset')`).
  - Created `/force-password-reset` page (Server Component + Suspense wrapper) and `force-reset-form.tsx` (Client Component).
  - Updated `UsersTable` with Status column (Active/Inactive/Reset Required) and Lifecycle actions (Change Role, Force Reset, Deactivate/Reactivate).
  - Created `toggleUserStatus`, `forcePasswordReset`, `clearPasswordResetFlag`, `updatePasswordAndClearFlag`, `updateUserRole` server actions.
  - **Critical Fix:** Fixed a Next.js 16 rendering bug on the `/force-password-reset` page by using `<Suspense>` and `await connection()`.
- **Unit 16.3: System-Wide Audit Log (Complete)**
  - `AuditLog` model + migration `20261115211407_add_audit_log_system`.
  - `logAudit()` helper (never throws — audit failures don't roll back main transactions). Enforces `beforeData`/`afterData` camelCase.
  - **All mutations wired:** User (6 events), Church (3 events), Region (2 events: `REGION_CREATED`, `REGION_UPDATED` — no `deleteRegion` function exists), KCB webhook (`PAYMENT_RECEIVED` with `allocations` array, called AFTER the Prisma transaction).
  - **UI:** `/dashboard/audit-logs` page — Server Component with `<Suspense>` + `await connection()`, RBAC gate (`isNationalLevel`), `AuditLogTable` client component with search, entity filter, action filter, column sort, checkbox selection, bulk export, and a `Forensic Snapshot` Dialog for pretty-printed `before_data` / `after_data` / `metadata`.
  - **Sidebar:** "Audit Logs" nav item added under `isNationalLevel` branch (`IconHistory`).
  - **Verification:** `tsc --noEmit` clean, `lint` 0 problems, `build` 22/22 pages (was 21, +1 for audit-logs).
- **Unit 16.5: Client Admin Roles (FINANCE_ADMIN / OPERATIONS_ADMIN)**
  - **Separation of Duties enforced.** Two new National-level admin roles added to the Prisma `Role` enum.
  - **Migration:** `20261116013856_add_finance_operations_admin_roles` applied cleanly. Zero data loss.
  - **`FINANCE_ADMIN`:** Full access to Payments, Mock KCB, and Reconciliation. Read-only access to Regions/Churches. Cannot manage Users.
  - **`OPERATIONS_ADMIN`:** Full CRUD on Regions, Churches, and Users. Read-only on Payments. No access to Mock KCB.
  - **`SYSTEM_ADMIN` (Super Admin):** Retains ultimate control. Can manage all accounts, including other admins.
  - **RBAC Helpers:** `lib/auth/roles.ts` extended with `isFinanceAdmin()` and `isOperationsAdmin()`. `isNationalLevel()` updated to include both new roles.
  - **Server-Side Guards:** Created `lib/auth/guards.ts` with `verifyOperationsAccess()` and `verifyFinanceAccess()`. Applied to all Church mutations (`createChurch`, `updateChurch`, `deleteChurch`), Region mutations (`createRegion`, `updateRegion`), and User mutations.
  - **Sidebar:** `app-sidebar.tsx` conditionally hides the "Users" tab for Finance Admins and "Mock KCB" for Operations Admins.
  - **Protected Accounts:** `PROTECTED_USER_IDS` (SYSTEM_ADMIN) cannot be modified by Finance or Operations Admins. Only SYSTEM_ADMIN can modify.
  - **Verification:** `tsc --noEmit` clean, `lint` 0 problems, `build` 22/22 pages.
- **Unit 17: Reconciliation, Manual Entry & Write-Offs (Merged PR #44 + verification round 2)**
  - **Migrations:** `20261116034805_add_reconciliation_and_writeoffs` + `add_cheque_payment_method`. 4 new models (`UnmatchedPayment`, `ResolutionPattern`, `WriteOff`, `PendingPayment`), 2 new fields (`Church.is_defunct`, `Payment.source`), `Cheque` added to `PaymentMethod` enum.
  - **Solutions Bank:** `lib/utils/matching.ts` learns from every resolution. Uses `fastest-levenshtein`. Confidence = `min(100, 50 + hit_count * 10)`.
  - **Webhook update:** `app/api/webhooks/kcb/route.ts` now captures unmatched into `UnmatchedPayment` with top fuzzy suggestion (returns HTTP 200 so bank stops retrying).
  - **Four-Eyes:** KES 20,000 threshold; 90+ day arrears always require Treasurer approval; write-offs are absolute four-eyes.
  - **Hybrid Allocation:** Server-side FIFO preview + client-side manual override before confirmation.
  - **Defunct church handling:** `Church.is_defunct = true` excludes from compliance %, regional scores, SMS lists, church dropdowns.
  - **Write-off accounting:** Gross outstanding unchanged, written-off subtracted via `sumApprovedWriteOffs`. FIFO deduction from aging buckets.
  - **UI:** 5 pages under `/dashboard/reconciliation` (hub + 4 sub-pages), 7 components, badge in sidebar.
  - **Verification:** All 8 manual tests passed. Found and fixed 2 critical security vulnerabilities (self-approval bypass in manual entries and write-offs). Fixed UI bugs: modal widths, Base UI `<Select>` UUID rendering, `FormData` payload error, and missing `Cheque` method in Payments Table.
  - **Local Church dashboard write-off awareness (added post-handoff):** `lib/actions/local-actions.ts` now returns `grossOutstanding`, `totalWrittenOff`, `netOutstanding` (querying `write_offs` where `status='Approved'`). `local-kpi-cards.tsx` and `churches/[code]/page.tsx` consume the new fields. Caught in verification round 2.
  - **Verification Round 2 (`test/17-reconciliation-verification` branch):** Fresh 8-step re-run discovered 3 more issues. (a) **Solutions Bank precedence flaw** — fuzzy matcher outvoted human-taught patterns in `suggestMatches()`. Fixed: short-circuit to pattern results before fuzzy loop. (b) **`recordResolution()` silent persistence failure** — rewrite now logs `🚨 FAILED TO RECORD RESOLUTION PATTERN:` instead of swallowing. (c) **`?tab=pending` hub card duplicated Pending Approvals** — commented out, tracked in Unit 17.5. Test 8 re-run confirmed passing.
  - **Post-merge hardening confirmed in `main`:** Four-eyes self-approval guards (`proposed_by === actorId`) present on all four approve/reject paths; `FOUR_EYES_THRESHOLD` single-sourced from `lib/constants.ts`.
- **Unit 17.5: System UI Wiring & Polish (Merged to Main)**
  - **Formatters:** Centralized `formatCurrency`, `formatDate`, and `formatDateTime` into `lib/utils.ts` with explicit `Africa/Nairobi` timezone support to prevent Vercel/UTC rendering bugs.
  - **Layouts & Logic:** Added `is_defunct` guard to `getSuggestedAllocations`. Permanently removed the commented-out `?tab=pending` duplicate hub card.
  - **Orphaned Unmatched Payments Fixed:** `rejectPendingPayment` now wraps in a `$transaction` to reset the linked `UnmatchedPayment` back to `Pending` (clearing `assigned_church_id`). `approvePendingPayment` now marks the `UnmatchedPayment` as `Resolved` and links `assigned_payment_id`.
  - **Source Tagging Fixed:** `approvePendingPayment` now dynamically sets `source: 'Resolved'` if the payment originated from an unmatched queue, or `'Manual'` otherwise.
  - **Gate:** `tsc` + `lint` pass cleanly.
- **Unit 18.1: Reporting Foundation & Core Reports (Complete)**
  - **Infrastructure:** Created `lib/utils/report-scope.ts` (strict role-based Prisma where clauses) and added `verifyReportsAccess()` to `lib/auth/guards.ts`. Fixed a missing `SYSTEM_ADMIN` check in `verifyReconciliationAccess()`.
  - **Navigation Overhaul:** Replaced the single-page client component (`reports-client.tsx`) with a Hub (`/dashboard/reports`) and Dynamic Sub-routes (`/dashboard/reports/[report]`). Build page count increased to 28/28.
  - **Arrears Bug Fix (Invariant 8):** `getArrearsReport()` now subtracts Approved Write-Offs. Table shows Gross Annual, Gross Monthly, Less WO, and Net Recoverable. Defunct churches are visible but carry a `Defunct` badge.
  - **Cashbook Bug Fix:** Imported and exported `getReadableMethod()` from `payments-table.tsx`. Cashbook now correctly displays `Cheque` instead of falling back to `Cash`.
  - **New Reports:** Built Write-Off Register, Defunct Church Register, and Inactive Church Report (6+ months no payment, excluding defunct/new churches).
  - **Gate:** `tsc --noEmit` clean, `lint` 0 problems, `build` 28/28 pages.
- **Unit 18.2-pre: `@@index([payment_date])` on `Payment` (Complete, Merged PR #51)**
  - Migration `20261118133648_add_payment_date_index` — single `CREATE INDEX "Payment_payment_date_idx"`. Applied locally; `migrate status` reports 9 migrations, up to date, no drift.
  - Prisma client regenerated (v7.10.1).
  - Gate: `tsc --noEmit` clean (after `npx next typegen` to populate `.next/types/` on the cold cache — environmental, not a regression), `lint` clean, `build` 28/28.
  - Note: at current row count the planner correctly prefers Seq Scan; the index is in place for reporting date-range queries as the table grows. This is the prerequisite that keeps Unit 18.2 read-only.
- **Unit 18.2: Reporting Analytics & Breakdowns (Complete, Merged PR #52)**
  - **Registry:** `lib/utils/report-registry.ts` — single source of truth for 11 reports (slug, title, description, group, visibleTo). Three consumers migrated: hub, `[report]` page, `<ReportSelector>`. `<ReportShell>` forwards `role` only (no slug list, grep verified). `import type { Role }` in `roles.ts` prevents Prisma leaking into the client bundle via the selector.
  - **Role mapping:** `toReportRole` in `lib/auth/roles.ts` — reuses the three `is*Level` helpers, never returns `'ALL'`, unknown → `'LOCAL'`.
  - **Scope extension:** `buildPaymentWhere(dbUser, regionId?)` — optional region narrowing for National roles; backwards compatible with 18.1 callers.
  - **Compliance single-source:** `isChurchCompliant(church, now)` extracted to `lib/utils/financial.ts`; `scoring-actions.ts` now calls it. Strict Bucket Isolation rule has one implementation.
  - **Scoring engine extension:** `RegionalScoreData` gained `grossOutstandingAnnual`, `grossOutstandingMonthly`, `totalWrittenOff` — populated from values the engine already computed. Existing fields unchanged; dashboard leaderboard math untouched.
  - **Scope helper:** `scopeByRole(sortedRows, dbUser)` in `lib/utils/report-scope.ts` — rank preserved globally (Regional viewer sees true rank, not "1 of 1").
  - **Six reports shipped** (all under `/dashboard/reports/[report]`):
    - **Collections Summary** — month/year period toggle, region filter, footer totals, no KPI strip (footer IS the totals).
    - **Compliance** — per-church via `isChurchCompliant`, Gross / Less WO / Net columns, KPI strip with defunct excluded from denominator, defunct rows sunk to bottom with badge.
    - **Regional Scores** — wraps `getRegionalScores`, `scopeByRole` applied, only real components rendered (compliance, score, tier, arrears); placeholder axes NOT rendered; row opens existing `RegionBreakdownDialog`.
    - **YoY Comparison** — cash basis by calendar year of `payment_date`; two-series bar chart above table; `—` for prior-year-zero Δ/%.
    - **Allocation Breakdown** — aggregate by `billing_year × allocation_type`; mandatory Discrepancy column (text-destructive when nonzero); year selector.
    - **Source/Method Breakdown** — cross-tab Source × Method; excludes PendingPayment/UnmatchedPayment/write-offs; `getReadableMethod` reused.
  - **Dashboard leaderboard tooltip:** Score column header now discloses that only the compliance axis is instrumented.
  - **Gate:** `tsc --noEmit` clean, `lint` 0 problems, `build` 28/28 pages (unchanged — six new slugs on `[report]`).
- **Unit 18.2.2a: Arrears Aging — Drillable (Complete, Merged PR #53)**
  - **Aging extraction:** `getAgingBuckets(church, ledger, now?)` added to `lib/utils/financial.ts` — single source of truth for 0-30 / 31-60 / 61-90 / 90+ aging math. Three modes: `'Combined'` (dashboard — FIFO write-off reduction, byte-identical to pre-refactor aggregates 2,000 / 5,000 / 5,000 / 100,500), `'Annual'` / `'Monthly'` (report — GROSS, no reduction, because `WriteOff` has no ledger attribution).
  - **Server action:** `getArrearsAgingReport(period, regionId?)` added to `lib/actions/report-actions.ts`. Returns `{ rows, scope_label, computed_at, total_written_off_in_scope, churches_with_write_offs }`. Scoped via `buildChurchWhere(dbUser)` + optional National-only `region_id` narrowing. WO disclosure computed across all churches in scope (before aging filter, includes defunct). `period` accepted per spec signature but unused server-side (`void period`) — both ledgers returned per row, client toggles locally.
  - **Component:** `components/reports/analytics/arrears-aging-table.tsx` — client component with period toggle (Annual/Monthly), region filter (hidden for Regional/Local via `regions.length === 0`), sortable columns (default Total Gross desc, resets on period toggle), case-insensitive church-code + church-name search, pagination (15/page), footer totals (defunct excluded), WO disclosure line below the table (church-level, includes defunct). All currency via `formatCurrency`, timestamp via `formatDateTime`.
  - **Registry:** `arrears-aging` slug registered in `lib/utils/report-registry.ts` (Analytics group, immediately after `arrears`, `visibleTo: ['ALL']`).
  - **Page branch:** `arrears-aging` branch added to `app/dashboard/reports/[report]/page.tsx` — pre-fetches `getArrearsAgingReport('Annual')` + `getRegionOptions()` in `Promise.all`.
  - **Verification:** `/dashboard/reports/arrears-aging` returns 200; hub card present in Analytics group; scope banner + `Computed:` timestamp + WO disclosure render; period toggle swaps without reload and resets sort; region filter hidden for non-National roles. All four visual checks passed.
  - **Gate:** `tsc --noEmit` clean, `lint` 0 problems, `build` 28/28 pages (unchanged — new slug on the existing `[report]` route).

## In Progress
_No unit currently in progress._ 18.2.2a complete, merged (PR #53), and branches cleaned. Ready to open 18.2.2b in a new session.

## Next Up
- **Unit 18.2.2b (ACTIVE): Prepayment / Credit Position rollup.** — `annualCredit` / `monthlyCredit` are surfaced only on the Local dashboard; there is no National/Regional rollup of cash received against future years. Read-only aggregate over existing data; no schema change; no product input required. Spec not yet authored — target `context/specs/18.2.2b-prepayment-credit-position.md`. Branch off `main` at `c9b05b2`; expected build stays 28/28 (one new slug on the existing `[report]` route).
- **Unit 18.2.1 (DEFERRED 2026-11-19): Instrument Timeliness / Accuracy / Engagement score axes.** Currently hardcoded placeholders in `scoring-actions.ts`; the
  40/30/20/10 formula is real but 60% of its input is synthetic. **Deferred pending
  client clarification** - all three axes lack product definitions and weight
  ordering. Do not schedule until the client defines each axis and its 40/30/20/10
  weight. See `## Open Questions`.
- **Then:** 18.3 (Reconciliation Reporting — **must include Payment Intake Health:
  webhook volume, unmatched backlog, and resolution SLA aging**) → 19 (Pay Now Wizard)
  → 20 (In-App Help) → 21/22 (Bank Sandbox, blocked on credentials) → polish.

## Open Questions
- **Pastorate Adoption:** The `Pastorate` model is reserved but dormant. The Ministry will decide after a few months of operation whether to activate this organizational layer.
- **Bank Preference:** The Ministry prefers Equity Bank over KCB. The V2 roadmap includes dual-bank support so either (or both) can be active.
- **Equity Jenga API:** The exact API credentials and payload format for Equity's IPN webhook are TBD.
- **Offline Remittance Handling:** How to handle payments made via cash, cheques, or direct bank transfers that bypass the webhook. Requires a manual entry UI for National HQ. (Addressed in Unit 17).
- **Score axis instrumentation (DEFERRED 2026-11-19):** The three placeholder axes (`timelinessPct`, `reportingAccuracy`, `leadershipEngagement`) have no product definition and no data source in the current schema. Deferred pending client clarification. Before Unit 18.2.1 can be scheduled, the client must answer for EACH axis: (a) what it measures in business terms, (b) the formula yielding a 0-100 value, (c) the data source (existing table or new field/table), (d) which of 40/30/20/10 it carries. Until then the placeholder values and the 18.2 disclosure tooltip remain, and the axes must never be rendered as measurements.
- **Scale monitoring tooling:** Which observation tooling will be used to track the Scale Watch metrics in production? Candidates: Vercel Analytics (built-in), Sentry performance, or a lightweight custom logger. Decision needed before church count grows further — not blocking 18.2.

## Architecture Decisions
- **KPI Grid — `<KpiGrid>`:** All KPI rows wrap in `<KpiGrid>` from `components/ui/kpi-grid.tsx`. Never inline `grid grid-cols-*` for a KPI row. 3-tier: 1 col < 600px container, 2 cols 600–1100px, 4 cols > 1100px. To change the standard, edit the component — one file, not 15.
- **KPI Value — `<KpiValue>`:** All KPI numbers use `<KpiValue>` from `components/ui/kpi-value.tsx`. Never inline `text-heading-*` or `truncate` on a KPI number. Color via `className` (e.g., `<KpiValue className="text-destructive">`). 3-tier font: `heading-3` base → `heading-2` at 300px → `heading-1` at 420px.
- **Table Toolbar — `<TableToolbar>`:** All tables use the shared toolbar (search `md:w-[300px]` on desktop / `w-full` on mobile, Base UI `<Select>` period toggle on mobile, icon-only Print/Export below `lg`).
- **Container Queries:** `app/dashboard/layout.tsx` provides `@container/main`. KPI grids and cards respond to container width, not viewport width — sidebar state irrelevant to card layout.
- **SYSTEM_ADMIN Role:** Reserved for vendor/platform owner. Protected via hardcoded allowlist in `lib/auth/protected-users.ts`. Cannot be deleted/deactivated by client's National Treasurer. Hidden from Users list unless viewer is also SYSTEM_ADMIN. Centralized RBAC in `lib/auth/roles.ts`.
- **Dashboard V2 Architecture (Unit 15.10):** The National Dashboard is undergoing a major overhaul. We are moving from a generic "data reporting" layout to an "Executive Command Center." Key changes: dropping the redundant "This Period" KPI card, replacing the Doughnut chart with Arrears Aging (0-90+ days), moving the timeframe toggle to the page header (global state), and introducing an Action Center with a direct SMS CTA. The Hero card will track "Expected-to-Date" instead of Year-End Target for accurate schedule adherence.
- **Post-deployment backlog structured into** table extraction (15h ✅) → 15.6 ✅ → 15i ✅ → 15.7 ✅ → 15.10 (V2 Dashboard ✅) → 16.1 ✅ → 16.2 ✅ → 16.3 ✅ → 16.5 ✅ → 17 (Merged PR #44 ✅) → 17.5 ✅ → 18.1 ✅ → 18.2 ✅ → 18.2.1 (deferred) → 18.2.2a ✅ → 18.2.2b → 18.3 → 19 → 20/21 → polish.
- **Pastorate Reserved:** A `Pastorate` model is added to the schema as a nullable foreign key on `Church`. Excluded from all financial calculations. Can be activated or removed without migrations.
- **Dynamic Fund Migration (V2):** The `PaymentType` enum will be migrated to a `Fund` table in V2. Enables admin-created payment categories without schema changes.
- **Dual-Bank Adapter Pattern (V2):** Webhook handlers for KCB and Equity will normalize their payloads into a single `NormalizedTransaction` shape, fed into a unified Reconciliation Engine.
- **Design System:** Strict use of semantic tokens defined in `globals.css`. No hardcoded hexes. Custom Figma tokens protected by `twMerge` extension in `lib/utils.ts`.
- **Tables:** All 8 tables (7 data + Users) use `<TableToolbar>`, `<TableShell>`, checkboxes for bulk selection, and shadcn `<Table>` primitives. `<TableShell>` (`components/ui/table-shell.tsx`) owns the card frame and uses `overflow-x-auto` so wide tables scroll horizontally instead of clipping columns (fixes the real `overflow-hidden` column-clipping bug — PR #34 / Unit 15h).
- **Print/Export Buttons:** All tables use `<PrintButton>` (icon-only below `lg`, custom `children` for non-default labels) and `<ExportDropdown>` (icon-only below `lg`).
- **Table Filter/Sort Dropdowns — shadcn `<Select>`:** All 5 tables with filter/sort selects use shadcn `<Select>` (Base UI variant, `onValueChange`) instead of native HTML `<select>`. Trigger styled `h-9 w-full bg-card text-xs` to preserve desktop layout. Use `if (val)` null guards — Base UI passes `string | null` to `onValueChange`. (PR #36 / Unit 15i).
- **Tooltips — Universal Primitive:** `components/ui/tooltip.tsx` uses `w-max !min-w-max whitespace-normal break-words max-w-[300px]` to auto-size the width and wrap long text. Never hardcode content in the base component — always pass via `children`. Never add `whitespace-nowrap` or `flex` to `TooltipPopup` — it forces vertical collapse. (Unit 15.7).
- **Auth Redirects — Hard Reload:** Login and Logout **must** use `window.location.replace()` instead of `router.push()`. This clears the Next.js Router Cache so stale React state (loading spinners, input values) cannot be resurrected after navigation. The `eslint-disable` for `no-location-assign-relative-destination` is unnecessary because `window.location.replace` is allowed. (Unit 15.7).
- **Sidebar — Auto-Hide on Mobile:** `SidebarProvider` imports `usePathname` from `next/navigation` and closes `openMobile` in an effect whenever the route changes. Prevents the mobile sheet from trapping the user after clicking a nav link. (Unit 15.7).
- **Exports:** All tables use `<ExportDropdown>`. Global Print/Export actions intercepted by `<ExportConfirmDialog>` to clarify scope.
- **Dialogs:** Base `<DialogHeader>` has `pr-12` to prevent title overlap. `<DialogTitle>` defaults to `text-heading-2` for forms, `text-heading-3` for alerts. Standard modal width is `w-[95vw] sm:w-full sm:max-w-[500px] p-6`.
- **Next.js 16:** All auth-protected routes require the universal `<Suspense>` wrapper and `await connection()` inside an async content component.
- **Financial Ledger:** Cumulative lifetime calculation via `getExpectedUpToDate()`. Strict Bucket Isolation applies across all tables, KPIs, and SMS messages.
- **Allocation Engine:** Payment records remain immutable 1:1 bank ledger entries. Attribution handled purely via the `PaymentAllocation` table.
- **Migration Baseline Repair (Unit 15 Phase 1):** The remote DB had 2 orphan `_prisma_migrations` records (`init`, `add_user_model`) with no corresponding local files. Repaired by (1) backing up via `pg_dump`, (2) clearing `_prisma_migrations`, (3) generating a fresh baseline migration from the current schema, and (4) marking it applied. Going forward: **no `db push`, no `migrate reset` on real data, commit all migrations, backup before any destructive operation.**
- **Migration Baseline (`00000000000000_baseline`):** Represents the entire pre-Unit-15 schema. Any new changes must be additive migrations on top of this baseline. Do not delete or modify this folder.
- **Audit Log System (Unit 16.3):** Append-only table. `logAudit()` must be called *after* successful mutations and must NEVER throw (wrapped in try/catch). `before_data` and `after_data` contain JSON snapshots for forensic recovery.
- **User Lifecycle (Unit 16.2):** Soft delete via `is_active`. Forced resets via `requires_password_reset` flag + `force-password-reset` fallback page. Enforced directly in the dashboard layout.
- **Audit Log UI (Unit 16.3):** Forensic JSON snapshots (`before_data` / `after_data` / `metadata`) are viewed via a `<Dialog>` modal, not inline. This keeps the table row height compact while providing full forensic detail on demand. Entity and Action filters are shadcn `<Select>` populated dynamically from unique values in the dataset.
- **Separation of Duties (Unit 16.5):** The client's admin roles are split into `FINANCE_ADMIN` (money) and `OPERATIONS_ADMIN` (registry/users). Neither can do the other's job — enforced by `lib/auth/guards.ts` at the server-action boundary. `SYSTEM_ADMIN` (Super Admin) can do both. This prevents any single client admin from creating a fake church, assigning a fake user, and routing payments to it.
- **Protected Role Hierarchy:** `PROTECTED_USER_IDS` (hardcoded vendor accounts) can ONLY be modified by another `SYSTEM_ADMIN`. Finance and Operations Admins attempting to modify a protected account receive a `403`-equivalent error returned from the server action. Enforced in `user-actions.ts` before every mutation.
- **RBAC Guard Pattern (`lib/auth/guards.ts`):** All mutations must call `verifyOperationsAccess()` or `verifyFinanceAccess()` at the top of the `try` block. If a caller lacks permission, the guard throws — the `catch` block converts this into a user-facing `{ error: 'Forbidden' }` return shape. This centralizes authorization so each action doesn't reimplement the check.
- **Reconciliation Four-Eyes (Unit 17):** KES 20,000 threshold on unmatched resolutions and manual entries. 90+ day arrears always require Treasurer approval regardless of amount. Write-offs require Treasurer approval at ALL amounts (no exception). `FOUR_EYES_THRESHOLD` exported from `lib/constants.ts` — single source of truth. Changing it here updates all four-eyes gates project-wide.
- **Four-Eyes Hardening (Unit 17 Verification):** Server actions `approvePendingPayment`, `rejectPendingPayment`, `approveWriteOff`, and `rejectWriteOff` all check `if (proposed_by === actorId)` and return an error. Four guards — approve AND reject on both entities. Never trust the client.
- **Solutions Bank (Unit 17):** `ResolutionPattern` table stores learned patterns. Every successful `resolveUnmatched` calls `recordResolution()` which upserts a pattern keyed by `(raw_reference_pattern, resolved_church_code)`. Confidence formula: `min(100, 50 + hit_count * 10)`. Patterns checked BEFORE Levenshtein in `suggestMatches()`. Never auto-commits a resolution — only surfaces suggestions.
- **Defunct Church Handling (Unit 17):** `Church.is_defunct = true` set automatically when a write-off covers the FULL outstanding (determined during `approveWriteOff`). Defunct churches are excluded from: compliance denominators, regional incentive scores, SMS reminder lists, church dropdowns in resolution/manual entry/write-off forms. They DO appear in financial reports (gross arrears + write-off register).
- **Write-Off Accounting (Unit 17):** Obligation is never reduced from `getExpectedUpToDate()` — the debt truly existed. Write-offs are subtracted from `outstanding` in reports via `sumApprovedWriteOffs()` + `getNetOutstanding()`. Aging buckets reduced FIFO (oldest debt written off first) so 90+ bucket shrinks before 0-30 bucket. This matches IFRS 9 / IPSAS 29.
- **Hybrid Allocation (Unit 17):** For unmatched resolutions and manual entries, server computes FIFO allocations via `computeExpectedPeriods` + `calculateAllocations` (same logic as KCB webhook Auto mode). Client receives the preview and can override each row before submission. Only after confirmation does a real `Payment` + `PaymentAllocation[]` get created.
- **PendingPayment Staging (Unit 17):** High-value manual entries / resolutions create a `PendingPayment` row — NEVER a `Payment`. Only after Treasurer approval does the real `Payment` get created (inside a single `$transaction` that also updates `PendingPayment.status = 'Approved'` and links `resulting_payment_id`).
- **`react-hooks/set-state-in-effect` Pattern (Unit 17):** Never call `setState` synchronously inside `useEffect`. Move state resets to event handlers (`handleOpenChange`, `handleChurchChange`). Effects should only do async fetch → setState in the async callback.
- **Solutions Bank Precedence (Unit 17 Verification Round 2):** `suggestMatches()` short-circuits to pattern results if *any* `ResolutionPattern` row matches — fuzzy matching is skipped entirely, not merely de-prioritized. A human-taught pattern can never be outvoted by Levenshtein distance. Fixed in `lib/utils/matching.ts` (returns `Array.from(suggestionMap.values())` before the fuzzy loop).
- **`recordResolution()` Error Logging (Unit 17 Verification Round 2):** `recordResolution()` swallows write failures to avoid breaking the outer `resolveUnmatched` transaction — but now logs `🚨 FAILED TO RECORD RESOLUTION PATTERN:` with the full Prisma error. Silent persistence failures surface in dev logs. Test 8 re-run confirmed pattern persistence works end-to-end.
- **Next.js 16.4.6 (verified):** `package.json` bumped `16.4.3` (pinned) → `^16.4.6` (caret) + npm audit sweep. Verified via `tsc --noEmit` + `lint` + `build` 27/27 pages clean. **Trade-off flagged:** the caret range now permits silent minor upgrades on `npm install` without a lockfile refresh — consider re-pinning to `16.4.6` if strict stable-stack discipline is desired.
- **Global Formatters (Unit 17.5):** All currency and date formatting must use `formatCurrency`, `formatDate`, or `formatDateTime` from `lib/utils.ts`. Dates are strictly locked to `Africa/Nairobi` timezone to prevent Vercel (UTC) rendering bugs. Never re-inline `Intl.NumberFormat` or `Intl.DateTimeFormat`.
- **Orphaned Unmatched Resolution (Unit 17.5):** When a `PendingPayment` is approved or rejected, the system queries for a linked `UnmatchedPayment` using `bank_reference === pending.transaction_id`. If approved, it marks the unmatched record as `Resolved` and links the new payment. If rejected, it resets the unmatched record back to the queue (`assigned_church_id = null`). Both actions are wrapped in a `$transaction` to prevent orphaned records.
- **Dynamic Payment Source (Unit 17.5):** The `Payment.source` field is now determined dynamically during `approvePendingPayment`. If the pending payment originated from an unmatched resolution (detected via the `UnmatchedPayment` link), `source` becomes `'Resolved'`. Otherwise, it stays `'Manual'`.
- **Reporting Navigation (Unit 18.1):** The Reports section uses a Hub (`/dashboard/reports`) + Sub-route (`/dashboard/reports/[report]`) pattern. This replaces the old single-page two-tab client view. Page count is expected to be 28/28.
- **Reporting Guards (Unit 18.1):** Report reads use `verifyReportsAccess()` (authenticated + known role), relying on `buildReportWhere()` and RLS for strict scoping (Invariant 2). Reconciliation reports use `verifyReconciliationAccess()`.
- **Inactive Church Definition (Unit 18.1):** Defined as no paid payment in the last 6 months, excluding defunct churches and churches created < 6 months ago.
- **Reporting Reuse Principle (Unit 18.2):** Reports consume existing financial and scoring logic — never re-derive. The 40/30/20/10 formula and Strict Bucket Isolation compliance rule have exactly one implementation (`lib/actions/scoring-actions.ts`); reports call it and render the result. Compliance rule additionally extracted to `lib/utils/financial.ts` → `isChurchCompliant(church, now)` so the compliance report and the engine share it. Drift between a report and the corresponding dashboard KPI is a defect, not a design choice.
- **Single Report Registry (Unit 18.2):** Slug → label → description → group → role visibility lives in `lib/utils/report-registry.ts` and serves three consumers: hub card grid, `[report]` page resolution, `<ReportSelector>` nav. Before 18.2, the mapping was duplicated across the hub and `[report]` page.
- **YoY Basis (Unit 18.2):** Year-over-year comparison uses **cash received — calendar year of `payment_date`**, not `billing_year` attribution. Prepayments counted in the year cash arrived. Subtitle on the page states this so readers do not mistake it for obligation satisfaction.
- **Allocation Reconciliation Column (Unit 18.2):** Allocation Breakdown carries a mandatory discrepancy column: Σ `PaymentAllocation.amount` must equal Σ `Payment.amount` in scope. Nonzero rows flag in `text-destructive`. Purpose: surface silent allocation defects at report time, not in a later audit.
- **Scoring Placeholder Disclosure (Unit 18.2):** Regional Incentive Score is currently computed from one real axis (`compliancePct`) and three hardcoded constants (`timelinessPct`, `reportingAccuracy`, `leadershipEngagement`). The Regional Scores report renders only the real components; the dashboard leaderboard Score column gains a matching info tooltip. Instrumenting the three axes is Unit 18.2.1 — not deferred indefinitely.
- **Engine Guard Boundary (Unit 18.2, observation):** `getRegionalScores()` has no caller guard; it relies on RLS at the DB layer. The report wrapper (`getRegionalScoresReport`) adds `verifyReportsAccess()` + `scopeByRole`. Adding a guard inside the engine is avoided because the engine cannot know the caller's render context. If a future audit finds RLS is not filtering `region.findMany()` as expected, harden at the caller of every engine invocation — do not add the guard inside the engine itself.
- **Server Action Error Shape (Unit 18.2, matches 18.1):** Report actions return `Promise<TypedRow[]>` and swallow errors as `catch → console.error → return []`. Empty array means either "no data" or "query failed"; the two are indistinguishable in the UI. Accepted for 18.2 for consistency. A discriminated `{ data } | { error }` result is a candidate for a later reporting-hardening unit.
- **Growth posture — no count assumptions (established pre-18.2):** The system currently holds ~60 regions and ~1,600+ churches, both growing. **No decision boundary in code, spec, or architecture may be anchored to those specific counts.** Performance thresholds use measured latency or measured payload size; UI counts are always derived from data, never literals. This applies project-wide. Tracked under `## Scale Watch`.
- **Score Axis Instrumentation Deferred (2026-11-19):** Unit 18.2.1 is deferred, not cancelled. Instrumenting `timelinessPct`, `reportingAccuracy`, and `leadershipEngagement` requires client-supplied definitions that do not exist in any context file. Per `ai-workflow-rules.md` ("Do not invent product behaviour"), no spec will be authored until those definitions are recorded. The 18.2 state stands: synthetic axes, disclosure tooltip on the leaderboard Score column, axes never rendered as measurements in the Regional Scores report. Next unit is 18.2.2, which needs no product input.
- **Aging Write-Off Presentation (Unit 18.2.2a):** `WriteOff` has no ledger attribution (a write-off is not tagged "Annual" or "Monthly"). Therefore per-ledger aging buckets in the Arrears Aging report are **GROSS** — no write-off netting — and approved write-offs are disclosed at the **church level** in a line below the table (`total_written_off_in_scope` + `churches_with_write_offs`). Matches IFRS 9 provision-matrix disclosure (gross aging + separate allowance line) and `getArrearsReport()` precedent. Per-ledger write-off netting is deferred until a future unit adds ledger type to `WriteOff`. The dashboard's `getAgingBuckets(..., 'Combined')` path still applies FIFO reduction to preserve dashboard chart behaviour — the three views are intentionally not required to reconcile to each other when payment allocations and `amount_paid` disagree.
- **`getAgingBuckets` — Single Source of Arrears Aging (Unit 18.2.2a):** Defined in `lib/utils/financial.ts`. The National dashboard Tier 3 chart (`dashboard-actions.ts`) and the Arrears Aging drillable report (`report-actions.ts`) both call it. **Do not re-implement aging math elsewhere.** Three modes: `'Combined'` (dashboard — FIFO write-off reduction), `'Annual'` / `'Monthly'` (report — GROSS, no reduction, because `WriteOff` is church-level). Extraction was behaviour-preserving — dashboard aggregate pre- and post-refactor identical (2,000 / 5,000 / 5,000 / 100,500).
- **Report Action Signature Convention — Dual-Ledger Response (Unit 18.2.2a):** When a report needs to expose multiple ledger views in the same response, the server action accepts the period parameter but returns **both** ledgers per row. `period` is marked `void period` to satisfy ESLint (see `code-standards.md` § Known ESLint Gaps). Client toggles locally without a refetch. This preserves `computed_at` semantics (only advances on region change or refresh) and eliminates redundant server round-trips on period toggle.

## Scale Watch

Tracked metrics and their triggers. **No report, action, or query may hardcode a
region count, church count, payment count, or any other growth metric.** Thresholds
below are expressed as measurements (latency, payload size), not counts, so they
remain valid as the system grows.

| Metric | Current target | Trigger | Action when triggered |
|---|---|---|---|
| Report p95 response time | < 2s | > 3s | Apply the report's mitigation from `18.2-reporting-analytics.md` → Scale Considerations. **Arrears Aging (18.2.2a)** mitigation: aggregate-query rewrite (per-church `aggregate` + date-windowed sums) — this report loops all in-scope churches × 2 ledgers per request |
| Compliance payload size | < 5,000 rows | > 5,000 rows | Switch from `findMany with includes` to per-church `aggregate` |
| Regional scoring p95 | < 2s | > 2s | Migrate score computation to background job |
| `Payment` table scans | 0 | Any observed via `EXPLAIN` | Ensure `@@index([payment_date])` is in place (Unit 18.2-pre) |
| Compliance per-church payment history load | per-request | TTFB > 3s | Switch to aggregate query pattern |

Update this table whenever a measurement changes — it is the living record of what
"scales" means for this system right now.

## Session Notes
- **Current Branch:** `main` (at `c9b05b2` — merge of PR #53 for 18.2.2a). Feature branches deleted local + remote: `feat/18.2.2a-arrears-aging-drillable` (this unit), `feat/18.2-reporting-analytics` (18.2), `feat/18.2-pre-payment-date-index` (18.2-pre).
- **Migration Head:** `20261118133648_add_payment_date_index`. **Production deploy status:** pending — `prisma7 migrate deploy` will run on the next Vercel deploy to apply the 18.2-pre index. All prior migrations (`20261116034805_add_reconciliation_and_writeoffs` + `add_cheque_payment_method`) are already applied to production. 18.2.2a added **no new migrations**.
- **Production Backfill:** `UPDATE "Payment" SET source='Webhook' WHERE source IS NULL;` has been applied successfully to production (verified 18 Webhook, 2 Manual).
- **AGENTS.md:** Updated to reflect 4 mandatory spec sections (Goal, Design, Implementation (including Dependencies), Verification) and standardized filename `project-overview.md`.
- **`@@index([payment_date])` on `Payment`:** Promoted from "deferred pre-launch" to **Unit 18.2-pre**. The old rationale ("not needed for 11 churches") is stale at 1,600+ churches and growing. Reports filter `Payment.payment_date` continuously — a missing index is a live table scan on an unbounded table. Implemented and merged (PR #51); see `## Completed`.
- **KCB and Equity APIs are still mocked.** Real sandbox integration pending client credential acquisition.
- **Africa's Talking is in sandbox mode.** Sandbox URL is configured via `AFRICASTALKING_API_URL` env var.
- **Vendor account confirmed:** `gilbertmulaha.ke@gmail.com`, UUID `86f0852b-23f2-4a32-a478-4e7b96f792d7`. This is the ONLY protected SYSTEM_ADMIN account.
- **Git Setup:** Remote origin is `https://github.com/gilbertmulahake-commits/maranatha-church-app.git`.
- **Deployed on Vercel.** Production URL active. `prisma7 migrate deploy` has been run against production Supabase (except the pending 18.2-pre index).
- **Browser Extension Warning:** Hydration mismatch occurs in normal browsers due to an extension injecting attributes. Harmless; use Incognito for development or add `suppressHydrationWarning` to `<html>`.
- **Stable Stack (Do Not Blindly Upgrade):** Next.js 16.4.6 (caret range — see Architecture Decisions, re-pinning decision pending), Prisma 7, Tailwind v4, Base UI (shadcn). Do not run `npm update` without testing.
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
- **Component Extraction Discipline:** When 3+ files share a pattern, extract a component before editing them. Completed extractions: `<TableToolbar>`, `<ExportDropdown>`, `<DataTablePagination>`, `<ExportConfirmDialog>`, `<KpiGrid>`, `<KpiValue>`, `<TableShell>`, `<PrintButton>`. Pending: none — Unit 15i closed the last gap.
- **Base UI `<Select>` Nullability:** Base UI's `<Select onValueChange>` signature passes `value: string | null` (cleared state). Never cast with `as string` — always guard with `if (val)` or widen the handler to accept `string | null`.
- **Base UI `<TooltipTrigger>` Requirement:** A `<TooltipTrigger>` must always be wrapped inside `<Tooltip.Root>`. Do NOT conditionally return the trigger outside the root — Base UI will throw a runtime error.
- **Supabase Auth PKCE Quirk:** For auth emails (Reset Password, Magic Links, Invites), the PKCE `?code=` exchange is unreliable in Next.js App Router due to `@supabase/ssr` auto-detection racing with manual exchange. Always use the `{{ .TokenHash }}` approach with `verifyOtp()`.
- **SMTP Provider:** Supabase is configured to use Resend SMTP (`smtp.resend.com`). The Free Tier built-in email service is restricted to 3 emails/hour and pre-authorized addresses only. Do not revert to the built-in service.
- **One File at a Time:** When migrating shared components, migrate one consumer per message, verify per file (findstr + build), then proceed. Prevents "15-file sweep" debt.
- **Verification Gate (Pre-Commit):** Always run `npx tsc --noEmit`, `npm run lint`, `npm run build` before committing. Never commit with failing tests. Zero exceptions.
- **Unit 18.2 entry (new session):** Branch off `main`. Spec at
  `context/specs/18.2-reporting-analytics.md`. Build stays **28/28** — six new slugs on
  the existing `[report]` dynamic route, not six new page files.
- **Deferred items tracked after 18.2:**
  - Arbitrary as-of date on Compliance (today-only for 18.2).
  - Background score computation (request-cycle for 18.2; documented in architecture).
  - Error-vs-empty discrimination on report actions.
  - **Instrument Timeliness / Accuracy / Engagement axes** (Unit 18.2.1 — the most
    consequential deferred item; see Architecture Decisions).
- **Growth posture (established this session):** The system currently holds ~60
  regions and ~1,600+ churches, both growing. **No decision boundary in code or in a
  spec may be anchored to those specific counts.** Performance thresholds use measured
  latency or measured payload size; UI counts are always derived from data, never
  from a literal. This applies project-wide, tracked under `## Scale Watch`.
- **`@@index([payment_date])` promoted:** From pre-launch deferral to **Unit 18.2-pre**
  — the old rationale referenced 11 churches, which is stale. Merged as one small PR
  (`20261118133648_add_payment_date_index`) before 18.2 opened.
- **`next typegen` for cold cache:** `tsc --noEmit` alone cannot resolve `LayoutProps<"/">` on a fresh checkout because `.next/types/routes.d.ts` is generated by the Next.js compiler, not shipped. Run `npx next typegen` (or `npm run build`) after a clean pull, before trusting `tsc`. This bit us on 18.2-pre and will recur on every fresh clone.
- **Enterprise reporting gap review (during 18.2):** Reviewed the 11-report set against
  enterprise-grade expectations for a 1,600+ church system. Three gaps identified, all
  deferred and tracked in Next Up: (a) Arrears Aging is aggregate-only on the dashboard
  — no drillable per-church aging report (delivered in 18.2.2a); (b) no National/Regional
  Prepayment / Credit Position rollup (scheduled as 18.2.2b); (c) Payment Intake /
  Reconciliation Health is out of scope until 18.3, where it is now explicitly required.
  Judged **not** to expand 18.2 mid-unit (scope discipline; the registry accommodates
  additional reports without structural change). Rejected as lower value for now: score
  trend history (blocked on 18.2.1), executive PDF digest, SMS delivery report, Manual
  Entry Register (covered by Source/Method + Cashbook + Audit Log).
- **Unit 18.2 complete (merged PR #52, `cf9c213`):** Registry-driven reporting layer, six Stage A/B reports, `isChurchCompliant` extracted, `RegionalScoreData` extended (gross/written-off without breaking the dashboard), region narrowing via `buildPaymentWhere(dbUser, regionId?)`, `scopeByRole` for rank-preserving regional filtering, dashboard leaderboard tooltip disclosing placeholder axes. Gate 28/28, page count unchanged. Branch deleted local + remote after merge. Instrumenting the three placeholder axes remains scheduled as Unit 18.2.1.
- **Unit 18.2.1 deferred, 18.2.2 opened (2026-11-19):** Client could not clarify the three score axes. Rather than invent definitions, 18.2.1 was formally deferred with the required answers itemised in `## Open Questions`. 18.2.2 (drillable Arrears Aging + Prepayment / Credit Position rollup) selected as the next unit: read-only, no schema change, no product input. Branch off `main` at `cf9c213`; migration head unchanged (`20261118133648_add_payment_date_index`); expected build stays 28/28 (new slugs on the existing `[report]` route).
- **Unit 18.2.2a complete (this session):** Split 18.2.2 into 18.2.2a (Arrears Aging drillable — this unit) and 18.2.2b (Prepayment / Credit Position rollup — next). Extracted `getAgingBuckets` to `lib/utils/financial.ts` (single source; dashboard byte-identical before/after extraction — 2,000 / 5,000 / 5,000 / 100,500 baseline vs. after Step 1 refactor). Added `getArrearsAgingReport` + `arrears-aging-table.tsx` + registry entry + page branch. `/dashboard/reports/arrears-aging` renders end-to-end; four visual checks passed (hub card present in Analytics group, scope banner + `Computed:` timestamp + WO disclosure render, period toggle swaps without reload and resets sort, region filter hidden for non-National roles). Gate: `tsc` clean, `lint` 0 problems, `build` 28/28 (unchanged). Merged to `main` via PR #53 (`c9b05b2`); branch deleted local + remote. One spec deviation noted: the page branch passes `initialResult` + `regions` as props (matching `CollectionsSummaryTable` pattern) rather than a propless `<ArrearsAgingTable />` — cleaner than client-fetch-on-mount and avoids the `react-hooks/set-state-in-effect` edge case.
- **Deferred — `params` outside `<Suspense>` on `/dashboard/reports/[report]`:** Next.js 16 dev warning fires on every report slug (`/arrears`, `/compliance`, `/arrears-aging`, etc.) because `ReportPage` awaits `props.params` outside the `<Suspense>` boundary. All routes return 200 — not a functional failure. **Not introduced by 18.2.2a** — pre-existing structure that predates this unit. Candidate follow-up unit: move `params` await inside `<Suspense>` (or set `export const instant = false` on the route). No scope decision yet; will be picked up alongside another `/dashboard/reports` unit.
- **Deferred — period-level drill-down on Arrears Aging:** Explicitly out of 18.2.2a scope per spec § Out of scope. Next drill: click a church row to see the underlying periods in each bucket (which specific billing years/months are overdue). Candidate follow-up after 18.2.2b.
- **Deferred — historical trend on Arrears Aging:** Period-over-period aging comparison requires persisted snapshots + schema (a `AgingSnapshot` table or similar). Separate unit. Not in 18.2.2b scope either — that unit is a *current-state* Prepayment / Credit Position rollup, not a historical trend.
- **LIFO→FIFO correction (Unit 18.2.2a):** Four files carried the stale "LIFO" misnomer in comments/docs (`architecture.md` § 7, `code-standards.md` § Write-Off Accounting, `lib/actions/scoring-actions.ts`, `HANDOFF_UNIT_17.md`). Corrected to FIFO (oldest debt written off first) in this unit. No logic change — comment/doc-only.