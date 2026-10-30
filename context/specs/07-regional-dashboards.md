# Unit 07: Regional Dashboards & Alerts

## Goal
Build the Regional Chairman Dashboard. When a user with the `REGIONAL_CHAIRMAN` role logs in, they must be routed to a dashboard that only shows data for their assigned region. This dashboard will display region-specific KPIs, a list of churches and their payment status, and an alerts panel for overdue churches.

## Design
- **Data Isolation:** Use Supabase RLS and Prisma to ensure a Regional Chairman can only query data where `region_id` matches their own.
- **Layout:** Use the existing `AppShell`. 
- **Header:** Display the Region Name prominently (e.g., "Northern Region Dashboard").
- **KPI Cards:** 3 cards specific to the region:
  - **Region Collected:** Total collected within this region.
  - **Region Arrears:** Outstanding balance within this region.
  - **Compliance Rate:** % of churches in the region that have paid.
- **Church Table:** A list of all churches in the region, showing their `church_code`, `church_name`, and payment `status` (Paid, Pending, Overdue). Use the custom table we built in Unit 04 (or a simplified version).
- **Alerts Panel:** A list of churches that are currently `Overdue` (or Pending for more than 30 days).

## Implementation

### 1. Route Redirection Logic
- Update `app/dashboard/page.tsx` to check the logged-in user's role.
- If the user is a `REGIONAL_CHAIRMAN`, redirect them to `/dashboard/region/[id]` (or a dedicated `/dashboard/regional` page).
- *Simplification for MVP:* We will build a single `/dashboard/regional` page that fetches the logged-in user's region automatically.

### 2. Server Action: `getRegionalStats`
- Create `lib/actions/regional-actions.ts`.
- The function must:
  - Get the current logged-in user via Supabase Auth.
  - Fetch their `User` record from the database to get their `region_id`.
  - Calculate:
    - Total collected for churches in that region.
    - Total expected for that region.
    - Arrears.
    - Compliance % (churches with a 'Paid' status / total churches).
  - Fetch all churches in that region and their latest payment status.

### 3. Regional Dashboard Page
- Create `app/dashboard/regional/page.tsx`.
- Fetch `getRegionalStats()`.
- Display the 3 KPI cards.
- Display a table of churches in the region.

### 4. Update the Main Dashboard Redirect
- In `app/dashboard/page.tsx` (National Dashboard), check the user's role. If they are a `REGIONAL_CHAIRMAN`, redirect them to `/dashboard/regional`.

## Verification Checklist
- [ ] A user with the `REGIONAL_CHAIRMAN` role is redirected to `/dashboard/regional` upon login.
- [ ] The regional dashboard shows only the churches and payments for that specific region.
- [ ] A National HQ Admin can still access `/dashboard` (the National Dashboard).
- [ ] No TypeScript or lint errors.