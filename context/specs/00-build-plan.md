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

### Phase 3: Production Go-Live & Infrastructure

14. **Unit 15: Deployment Preparation**
    - Vercel hosting, production Supabase, live KCB webhooks, live Africa's Talking SMS.
    - Add `Pastorate` model (nullable, dormant) and expand `User` bio-data.
    - Upgrade the `NavUser` dropdown to industry standard.

### Phase 4: V2 Roadmap (Post-Launch Expansion)

15. **Unit 16: Internal Communication Channel**
    - Enterprise-grade threaded inbox with presence (Online/Busy), archival, and read/unread states. Built on Supabase Realtime.
16. **Unit 17: Dynamic Fund Architecture**
    - Migrate `PaymentType` enum → `Fund` table. Admin can create custom funds (e.g., Building Fund, Youth Camp) via Settings.
17. **Unit 18: Dynamic Payment Channels & Dual-Bank Support**
    - Migrate `PaymentMethod` enum → `PaymentChannel` table. Add `BankAccount` table.
    - Support KCB + Equity Bank simultaneously, with the ability to toggle each off.
    - Implement the Bank Adapter Pattern for normalized webhook ingestion.
18. **Unit 19: Report Explorer**
    - Convert the static Reports tab into a dynamic Report Explorer (Compliance Summary, Fund Breakdown, Channel Analysis, SMS Log, Unmatched Payments, Auditor Report).
19. **Unit 20: Settings Optimization**
    - Break Settings into sub-tabs: My Profile, System Configuration (Funds, Channels, Banks, Pastorates), User Management, SMS Templates, Reports Configuration.
20. **Unit 21: User Bio-Data & Profile Pages**
    - Build `/dashboard/profile` for users to edit their bio-data (first name, last name, phone, avatar).