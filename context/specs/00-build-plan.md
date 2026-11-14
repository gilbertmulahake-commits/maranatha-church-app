```markdown
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
- **15h. 7-Table Migration (PR #33, commit `80551c7`)** ✅ — All 7 tables migrated to `<TableShell>` + `<PrintButton>`: `church-table.tsx`, `payments-table.tsx`, `region-table.tsx`, `regional-table.tsx`, `arrears-table.tsx`, `cashbook-table.tsx`, `local-payment-history.tsx`.
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
16. **Unit 15.7: Critical Bug Fixes & Mobile Responsiveness**
    - Logout loading state, "Mixed" badge tooltip, Login page mobile stacking, Table toolbar mobile, Sidebar auto-hide, Sidebar minimize toggle.

**Safety — Password Reset & Audit**
17. **Unit 16.1: Password Reset & Email Verification**
    - Forgot Password flow, reset landing page, email verification enforcement.
18. **Unit 16.2: User Lifecycle**
    - Soft delete (`is_active` on User), force password reset, role change with audit trail.
19. **Unit 16.3: Audit Log System**
    - New `AuditLog` Prisma model, log all mutations, `/dashboard/audit-logs` page with filters + CSV export.

**Enhancement — Dashboard Polish**
20. **Unit 15.8: Dashboard Experience Polish**
    - Interactive live feed, Doughnut chart enhancement, Church profile modal on row select, Functional "My Profile" link.
21. **Unit 15.9: Dashboard Mini Tables**
    - Mini Regions table (top 5 compliance), Mini Churches table (recent/at-risk).

**Major Features — Payment Flows**
22. **Unit 17: Unmatched Payments Queue & Manual Entry**
    - `UnmatchedPayment` model, Levenshtein fuzzy matching, `/dashboard/payments/unmatched` review UI, manual entry form for cash/cheques.
23. **Unit 18: Guided Payment Flow (Pay Now Wizard)**
    - `PaymentIntent` model, 5-step wizard, manual M-Pesa instructions with polling verification.

**Onboarding & Support**
24. **Unit 19: In-App Help & Onboarding**
    - Tooltips, contextual help cards, `react-joyride` tour, `/help` page, help drawer.

**Breakthrough — Real Bank Sandbox**
25. **Unit 20: KCB Sandbox Integration** (Blocked on client credentials)
26. **Unit 21: Equity Sandbox Integration** (Blocked on client credentials)

**Polish — As Time Allows**
27. **Unit 22: Settings Sub-tabs** (My Profile, System Config, Users, SMS Templates)
28. **Unit 23: 2FA for National HQ + SYSTEM_ADMIN**
29. **Unit 24: Dynamic Fund Architecture** (Migrate `PaymentType` enum → `Fund` table)
30. **Unit 25: Pastorate Layer Activation** (Pending Ministry decision)
```