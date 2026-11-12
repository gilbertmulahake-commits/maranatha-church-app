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

### Phase 4: Post-Deployment Enhancement (V2)

**Pre-UAT (Blocking Handover)**
15. **Unit 15.6: SYSTEM_ADMIN Role & Protected User Accounts**
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