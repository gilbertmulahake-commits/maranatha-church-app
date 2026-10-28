# Build Plan - Maranatha Church System

This is the ordered list of units we will build. We will write a detailed spec for each unit before building it.

1. **Unit 01: Project Initialization & Database Setup**
   - Set up Supabase, connect Prisma, and create the initial database schema (Regions, Churches, Payments, Regional Scores).
2. **Unit 02: Authentication & Role-Based Routing**
   - Set up Supabase Auth. Create login page. Implement middleware to protect routes based on roles (Church, Region, HQ).
3. **Unit 03: App Shell & UI Layout**
   - Build the sidebar, topbar, and main layout based on `ui-context.md`.
4. **Unit 04: Church Management (CRUD)**
   - UI and API to add, view, and edit churches. Assign them to regions.
5. **Unit 05: Mock KCB Webhook & Payment Reconciliation**
   - Build the API endpoint to receive mock KCB payments. Implement the logic to match `BillRefNumber` to Church ID. Handle unmatched payments.
6. **Unit 06: HQ Dashboard (Real-time KPIs & Charts)**
   - Build the main dashboard for HQ: Total collected, target progress, compliance charts.
7. **Unit 07: Regional Dashboard & Alerts**
   - Build the Regional dashboard showing compliance rates for their specific region.
8. **Unit 08: SMS Integration (Africa's Talking)**
   - Connect the SMS API. Build a background job to send automated reminders for overdue payments.
9. **Unit 09: Incentive Scoring Engine**
   - Build the logic and UI to calculate and display the 40/30/20/10 weighted scores for regions.
10. **Unit 10: Reporting & Export**
    - Build the Daily Cashbook and Arrears Report with CSV/PDF export functionality.
11. **Unit 11: Final Polish & Deployment Prep**
    - Final UI adjustments, error handling, and deployment.