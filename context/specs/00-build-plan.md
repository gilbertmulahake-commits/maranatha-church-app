# Build Plan - Maranatha Church System

This is the ordered list of units we will build. We will write a detailed spec for each unit before building it.

### Phase 1: MVP Foundation (Completed)

1. **Unit 01: Project Initialization & Database Setup** ✅
   - Set up Supabase, connect Prisma, and create the initial database schema (Regions, Churches, Payments, Regional Scores).
2. **Unit 02: Authentication & Role-Based Routing** ✅
   - Set up Supabase Auth. Create login page. Implement middleware to protect routes based on roles.
3. **Unit 03: App Shell & UI Layout** ✅
   - Build the sidebar, topbar, and main layout based on `ui-context.md`.
4. **Unit 04: Church Management (CRUD)** ✅
   - UI and API to add, view, and edit churches. Assign them to regions.
5. **Unit 05: Mock KCB Webhook & Payment Reconciliation** ✅
   - Build the API endpoint to receive mock KCB payments. Implement the logic to match `BillRefNumber` to Church ID.
6. **Unit 06: HQ Dashboard (Real-time KPIs & Charts)** ✅
   - Build the main dashboard for HQ: Total collected, target progress, compliance charts.
7. **Unit 07: Regional Dashboard & Alerts** ✅
   - Build the Regional dashboard showing compliance rates for their specific region.
8. **Unit 08: SMS Integration (Africa's Talking)** ✅
   - Connect the SMS API. Build a background job to send automated reminders.
9. **Unit 09: Incentive Scoring Engine** ✅
   - Build the logic and UI to calculate and display the 40/30/20/10 weighted scores for regions.
10. **Unit 10: Reporting & Export** ✅
    - Build the Daily Cashbook and Arrears Report with CSV/PDF export functionality.
11. **Unit 11: Final Polish & Deployment Prep** ✅
    - Final UI adjustments, error handling, and deployment.

### Phase 2: Enterprise Upgrades (Completed)

12. **Unit 14.5: Payment Allocation Engine** ✅
    - Built strict FIFO priority engine for split payments (Mixed deposits).
13. **Unit 14.6: Enterprise UI Polish & Consistency** ✅
    - Standardized tables, toolbars, exports (CSV/Excel/PDF/Print), KPI sizing, and dialogs.

### Phase 3: Production Go-Live & Infrastructure (Completed)

14. **Unit 15: Deployment Preparation & Infrastructure (Phases 1-5)** ✅
    - Migration baseline repair, environment templates, Bank Adapter Engine, Africa's Talking Live SMS integration, and Profile UI upgrade.
    - Successfully deployed to Vercel Production with Supabase and AT Sandbox wired up.

### Phase 3.5: Post-MVP UI Componentization (Completed)

Not originally planned, but necessary to fix production bugs discovered after deployment and to establish single-source-of-truth components before adding more features. All work is a strict refactor of existing screens — no new user-facing features.

**Merged:**
- **15a. Dashboard Reconciliation** ✅ — Strict Bucket Isolation rewritten in `scoring-actions.ts` to match National KPI compliance definition. Fixed Regional Leaderboard over-counting.
- **15b. Net Credit Label** ✅ — `Network Net Credit` → `All-Time Net Credit` in `kpi-cards.tsx` (KPI uses lifetime, not YTD).
- **15c. Region Edit Action** ✅ — Wired `EditRegionDialog` to previously dead "Edit Region" dropdown item.
- **15d. Responsive Toolbar (PR #29)** ✅ — `TableToolbar` refactored: search `md:w-[300px]` on desktop / `w-full` on mobile, Base UI `<Select>` for period toggle on mobile, icon-only Print/Export below `lg`.
- **15e. Responsive Shadcn Pattern (PR #30)** ✅ — `mx-auto max-w-[1440px]` on dashboard layout (prevents 4K stretch), `@container/main` for container queries, KPI density tuned (p-4 headers/footers, text-xs labels).
- **15f. KPI System Extraction (PR #31)** ✅ — Created `<KpiGrid>` (3-tier responsive grid) and `<KpiValue>` (3-tier responsive typography). Migrated all 15 KPI locations (7 components + 8 Suspense skeletons).
- **15g. Table Components Extracted (PR #32)** ✅ — Created `<TableShell>` (wrapper with `overflow-x-auto` — fixes column-clipping bug) and `<PrintButton>` (icon-only on mobile, custom label support).
- **15h. 7-Table Migration (PR #34, commit `80551c7`)** ✅ — All 7 tables migrated to `<TableShell>` + `<PrintButton>`: `church-table.tsx`, `payments-table.tsx`, `region-table.tsx`, `regional-table.tsx`, `arrears-table.tsx`, `cashbook-table.tsx`, `local-payment-history.tsx`.
  - **Fixes a real bug**: `overflow-hidden` on the old table wrapper silently clipped columns on tablet/mobile. `<TableShell>` uses `overflow-x-auto` so wide tables scroll horizontally instead of hiding data.
  - `TableFooter` (grand/daily totals) preserved **inside** `<TableShell>` in `arrears-table.tsx` and `cashbook-table.tsx`.
  - Verification: `tsc --noEmit` clean, `lint` 0 problems, `build` 18/18 pages, per-file `findstr` gate passed on all 7 files.
- **15i. TableToolbar `<Select>` Standardization (PR #36, commit `7261132`)** ✅ — Replaced all native HTML `<select>` elements in the 5 affected tables with shadcn `<Select>` (Base UI variant). Migrated `onChange` → `onValueChange`, added `if (val)` null guards, kept `h-9 w-full bg-card text-xs` trigger styling. Files: `church-table.tsx`, `payments-table.tsx`, `region-table.tsx`, `regional-table.tsx`, `local-payment-history.tsx`.

### Phase 4: Post-Deployment Enhancement (V2)

**Pre-UAT (Blocking Handover)**
15. **Unit 15.6: SYSTEM_ADMIN Role & Protected User Accounts** ✅ (Merged PR #35)
    - Add `SYSTEM_ADMIN` to Role enum.
    - Create `lib/auth/protected-users.ts`.
    - Enforce protection in `user-actions.ts`.
    - Update `proxy.ts` and sidebar.
    - Vendor creates own SYSTEM_ADMIN account via Supabase Dashboard.

**Immediate — Bugs & Mobile**
16. **Unit 15.7: Critical Bug Fixes & Mobile Responsiveness** ✅ (Merged PR #37)
    - Logout loading state, "Mixed" badge tooltip, Login page mobile stacking, Table toolbar mobile, Sidebar auto-hide, Sidebar minimize toggle.
    - Additional fixes discovered during implementation: Auth Router Cache bug (ghost "Signing in..." state after logout), Base UI Tooltip collapse, legacy native `<select>` in `TableToolbar`.

**Safety — Password Reset & Audit**
17. **Unit 16.1: Password Reset & Email Verification** ✅
    - Forgot Password flow, reset landing page, email verification enforcement.
    - **Critical:** Uses `{{ .TokenHash }}` (not PKCE `?code=`) to avoid Next.js SSR cookie race. Supabase SMTP is Resend (Free Tier rate limits bypassed).
18. **Unit 16.2: User Lifecycle** ✅
    - Soft delete (`is_active` on User), force password reset (`requires_password_reset`), role change with audit trail.
    - Enforced in `app/dashboard/layout.tsx` (redirects inactive users and forced-reset users).
    - `UsersTable` has Status column + Lifecycle actions (Change Role, Force Reset, Deactivate/Reactivate).
19. **Unit 16.3: Audit Log System** ✅
    - New `AuditLog` Prisma model + migration `20261115211407_add_audit_log_system`.
    - `logAudit()` helper in `lib/actions/audit-actions.ts` (never throws — audit failures don't roll back main transactions).
    - Wired: User mutations (6 actions) + Church mutations (3 actions) + Region mutations (2 actions: `REGION_CREATED`, `REGION_UPDATED`) + KCB webhook (`PAYMENT_RECEIVED` with allocations, called AFTER the transaction).
    - `/dashboard/audit-logs` UI page built — search, entity/action filters, column sort, checkbox selection, bulk export, RBAC gate, Forensic Snapshot Dialog.
    - Sidebar "Audit Logs" nav item added under `isNationalLevel` branch.
    - Verification: `tsc` + `lint` + `build` (22/22 pages) all clean.

**Client Admin Roles**
20. **Unit 16.5: Client Admin Roles (FINANCE_ADMIN / OPERATIONS_ADMIN)** ✅
    - Separation of Duties enforced. `FINANCE_ADMIN` handles money; `OPERATIONS_ADMIN` handles registry/users.
    - Migration `20261116013856_add_finance_operations_admin_roles` applied cleanly.
    - RBAC helpers added to `lib/auth/roles.ts`. Server-side guards in `lib/auth/guards.ts`. Applied to all Church, Region, and User mutations.
    - Sidebar conditionally renders "Users" (Operations only) and "Mock KCB" (Finance only).
    - SYSTEM_ADMIN remains the Super Admin. Protected accounts can only be modified by SYSTEM_ADMIN.
    - Verification: `tsc` + `lint` + `build` (22/22 pages) all clean.

**Enhancement — Dashboard Polish**
21. **Unit 15.10: Executive Command Center (Dashboard V2)** ✅ (this session)
    - Overhauled the National Dashboard layout to prioritize executive decision-making over generic data reporting.
    - **Tier 1 (Command Bar):** Hero Card (Expected-to-Date vs Target), Action Center (Arrears count + CTA to SMS).
    - **Tier 2 (Bucket Health):** Isolated Annual and Monthly KPIs, Compliance Snapshot (Counts, not percentages), Network Coverage KPI.
    - **Tier 3 (Analytics):** Arrears Aging Distribution (0-30, 31-60, 61-90, 90+ days) replacing the Doughnut chart.
    - **Tier 4 (Accountability):** Leaderboard with Arrears column + Region Breakdown Dialog, Live Feed moved to right side (5 cols).

> **Note on 15.8 and 15.9:** The original `15.8 (Dashboard Experience Polish)` and `15.9 (Dashboard Mini Tables)` units were **superseded by Unit 15.10 (V2 Dashboard)**. The V2 architecture absorbed the interactive live feed (Tier 4), replaced the doughnut chart with arrears aging (Tier 3), and added the region breakdown modal (Tier 4). Any residual sub-items (e.g., church profile modal on row select, functional "My Profile" link) can be verified during UAT and addressed as micro-fixes if needed.

**Major Features — Reconciliation, Reporting & Payment Flows**
22. **Unit 17: Reconciliation, Manual Entry & Write-Offs** ✅ (Merged — PR #44 + verification fixes)
    - **Migrations:** `20261116034805_add_reconciliation_and_writeoffs` + `add_cheque_payment_method`.
    - **4 New Models:** `UnmatchedPayment`, `ResolutionPattern` (Solutions Bank), `WriteOff`, `PendingPayment`.
    - **2 New Fields:** `Church.is_defunct`, `Payment.source`.
    - **Enum Update:** `PaymentMethod` now includes `Cheque`.
    - **Webhook:** Captures unmatched payments with fuzzy suggestions, returns 200 instead of 404.
    - **Four-Eyes:** KES 20,000 threshold; 90+ arrears always escalate; write-offs always escalate.
    - **Solutions Bank:** Learns from every resolution, checked before Levenshtein.
    - **Defunct handling:** Excluded from compliance %, regional scores, SMS lists, dropdowns.
    - **UI:** 5 pages under `/dashboard/reconciliation`, 7 components, sidebar badge.
    - **Gate:** `tsc` + `lint` + `build` (27/27 pages) clean.
    - **Verification:** All 8 manual tests passed (Test 8 re-run after Solutions Bank precedence fix). Two security issues hardened (four-eyes self-approval). Local Church dashboard write-off awareness added post-handoff.
    - **Deferred:** `?tab=pending` hub card commented out (duplicate of Pending Approvals) — tracked in Unit 17.5.

22.5. **Unit 17.5: System UI Wiring & Polish** (Post-Unit-17 cleanup, pre-Unit-18)
    - Audit and wire any un-wired components from Unit 17 (e.g., `Pending Payments` hub card — currently commented out pending a real `?tab=pending` destination).
    - Layout-collapse sweep: `min-w-0` and grid-wrapper audit across KPI cards and detail pages (some fixed in Local Church dashboard during Unit 17 verification).
    - Label/route mismatches, unused-component wiring, dialog-width consistency.
    - Feeds into Unit 18 so the Reporting Overhaul starts on clean UI ground.

23. **Unit 18: Comprehensive Reporting Overhaul** (NEXT after 17.5)
    - 14+ reports across National/Regional/Local.
    - YoY comparison, Allocation Breakdown, Inactive Church Report.
    - Feeds on new write-off + unmatched data from Unit 17.
    - Replaces the current minimal `/dashboard/reports` page.

23.1. **Unit 18.2.1: Score Axis Instrumentation** (DEFERRED 2026-11-19, pending client clarification)
    - Currently the 40/30/20/10 formula runs on one real axis (`compliancePct`) plus three hardcoded placeholders (`timelinessPct`, `reportingAccuracy`, `leadershipEngagement`).
    - Blocked: client must define each axis (business meaning, formula, data source, 40/30/20/10 weight) before any spec can be authored.
    - Do not schedule until those definitions are recorded in `progress-tracker.md` → `## Open Questions`.

23.2. **Unit 18.2.2: Arrears Aging Drillable + Prepayment / Credit Position** ✓
    - (a) Drillable Arrears Aging — completed 18.2.2a, merged PR #53 (`c9b05b2`).
    - (b) Prepayment / Credit Position — completed 18.2.2b, merged PR #54 (`5200632`).
    - Both read-only, no schema change. Registered as new slugs in `lib/utils/report-registry.ts`; no new page files. Build stayed 28/28.

23.3. **Unit 18.3: Reconciliation Reporting — Payment Intake Health** (NEXT)
    - Three National-only reconciliation health reports over the `UnmatchedPayment` and `Payment` (source='Webhook'|'Resolved') tables.
    - (a) `payment-intake-volume` — webhook flow per day, Straight-Through Rate, manual intervention rate, rejection rate.
    - (b) `payment-unmatched-backlog` — current-state aging snapshot with KES value at risk.
    - (c) `payment-sla-aging` — 72h SLA compliance over actioned items, bucketed by time-to-action.
    - One additive migration: three preventive indexes on `UnmatchedPayment` (`created_at`, `reviewed_at`, `status+created_at`). No model changes.
    - Registered as three new slugs on the existing `[report]` route. Build stays 28/28.


24. **Unit 19: Guided Payment Flow (Pay Now Wizard)**
    - **19a — Schema:** `PaymentIntent` v2 with `channel`, `provider_request_id`, `provider_receipt`, `provider_result_code`, `raw_callback`; composite indexes; extend Invariant 3. No external dependency.
    - **19b — Manual wizard:** 5-step wizard with payment priority (FIFO arrears → current → prepayment), manual instructions for M-Pesa Paybill / KCB app / Equity app, and polling verification against `Payment` / `UnmatchedPayment`. No bank API call. Permanent fallback channel.
    - **19c — STK Push (sandbox):** `lib/payments/providers/kcb-buni.ts` and `equity-jenga.ts` behind a shared adapter; `initiateStkPush` server action; `app/api/webhooks/payments/[provider]/stk-callback/route.ts`; Jenga status query fallback; KCB callback-first fallback. Both providers verified in their sandboxes. KCB query 500 → `Pending`, never `Failed`. Jenga truth = IPN, not STK callback.
    - **19d (Unit 19.5) — Go-live:** Production credentials, `PAYMENT_PROVIDER_MODE=live`, IP-allowlist callbacks, rate-limit monitoring. Blocked on KCB Go-Live and Equity Live Onboarding approvals.

**Onboarding & Support**
25. **Unit 20: In-App Help & Onboarding**
    - Tooltips, contextual help cards, `react-joyride` tour, `/help` page, help drawer.
    - Status: ✅ COMPLETE. First-party Guided Tour (no react-joyride); Help drawer built on protected Sheet primitive with inline styles bypass.

### Phase 4.5: Post-Unit-20 Enhancements

25.5. **Unit 20.5: Navigation Parity & Cross-Linking** - ✅ COMPLETE
    - Regional table church names become links to `/dashboard/churches/[code]`. National church table gains "View Details" dialog with "Go to Church Page" CTA. `EntityBackButton` (`router.back()` with list-page fallback) replaces hardcoded `<Link>` back buttons on region and church detail pages. Fixes leaderboard -> region -> Back navigation.
    - No schema change. Build count 29/29.

25.6. **Unit 20.6: Regional Church Deletion Requests** - Phase A ✅ COMPLETE, Phase B pending
    - **20.6a (Phase A) Soft Delete Foundation:** `Church.deleted_at DateTime?` replaces hard delete in `deleteChurch`. Migration `20261121145153_add_church_soft_delete`. Soft-delete filter swept across 13 files. Financial disclosure registers (Write-Off, Defunct) preserve deleted churches with `church_deleted` annotation (IFRS 9 / IPSAS 29). Money-ledger views preserve deleted-church payments via `buildPaymentWhere` (deliberately unfiltered). `deleteChurch` preconditions match Phase B approval path (no Pending staging). Pre-existing "Edit Church" bug in `regional-table.tsx` fixed in-session. Build count 29/29.
    - **20.6b (Phase B) Request Workflow + Approval Queue:** Regional Chairman / Regional Treasurer submit deletion requests; National Operations Admin / System Admin / National Treasurer approve or reject. New `ChurchDeletionRequest` model. Four-eyes, atomic claim, enum-plus-OTHER reason taxonomy. New page `/dashboard/church-deletion-requests`. Pending - gated on Phase A committing.

25.6.1. **Unit 20.6.1: Regional Dashboard Compliance Alignment** - ✅ COMPLETE
    - `regional-actions.ts` combined-totals compliance replaced with strict-bucket via `isChurchCompliant`. `is_defunct` excluded from counters and denominator; `Defunct` badge added to `regional-table.tsx`. Same fix applied to `region-actions.ts` (`getRegionsWithStats`, `getRegionStats`, `getSingleRegionStats`), which also received the missing Phase A `deleted_at: null` sweep filter (Phase A gap). Three files, zero migrations. Gate 29/29. Commit 2 after Phase A (`7083ffa`).

**Breakthrough — Real Bank Sandbox**
26. **Unit 21: KCB Sandbox Integration** (Blocked on client credentials)
27. **Unit 22: Equity Sandbox Integration** (Blocked on client credentials)

**Polish — As Time Allows**
28. **Unit 23: Settings Sub-tabs** (My Profile, System Config, Users, SMS Templates)
29. **Unit 24: 2FA for National HQ + SYSTEM_ADMIN**
30. **Unit 25: Dynamic Fund Architecture** (Migrate `PaymentType` enum → `Fund` table)
31. **Unit 26: Pastorate Layer Activation** (Pending Ministry decision)