# Unit 06: National HQ Dashboard (Real-time KPIs & Visual Insights)

## Goal
Build a premium, real-time financial command center. Implement Server Actions to aggregate data from the database and display them using optimized KPI cards, a progress bar, and visual charts (Recharts). The dashboard must be visually engaging, data-dense, and update instantly when a payment is processed.

## Design (Premium Fintech UI)
- **Layout:** Use the existing `AppShell`. 
- **Header:** Add a "Quick Actions" section in the top right (e.g., "Simulate Payment" button linking to `/dashboard/mock-kcb`).
- **KPI Grid:** 4 cards in a row (`grid-cols-4`).
  - **Card 1 (Total Collected):** Bold green number, subtle background icon (Banknote), and a small trend indicator (e.g., `↑ 12% from last month`).
  - **Card 2 (Target Progress):** A visual progress bar showing `Collected / 17.6M`. Display the percentage prominently.
  - **Card 3 (Outstanding Arrears):** Red accent. Bold number.
  - **Card 4 (Active Churches):** Shows `Total Churches / Total Regions` (e.g., "1,600 Churches in 60 Regions").
- **Charts:** 
  - **Bar Chart (Monthly Collections):** Rounded bars, navy blue gradient. Hover tooltip showing exact KES.
  - **Donut Chart (Payment Methods):** Sleek donut with the total amount in the center.
- **Styling:** Strict adherence to `ui-context.md` (Slate/Navy). Use `tabular-nums` for all financial figures.

## Implementation

### Dependencies
- `recharts` (for the Bar and Donut charts)

### 1. Server Action: `getDashboardStats`
- Create `lib/actions/dashboard-actions.ts`.
- Calculate:
  - **Total Collected:** Sum of `amount_paid` from `Payment` where `status = 'Paid'`.
  - **Total Expected:** KES 17,600,000.
  - **Outstanding:** Total Expected - Total Collected.
  - **Collection Percentage:** (Total Collected / Total Expected) * 100.
  - **Total Churches & Regions:** Use `prisma.church.count()` and `prisma.region.count()`.

### 2. Dashboard Page
- Rewrite `app/dashboard/page.tsx` as an async Server Component calling `getDashboardStats()`.
- Format currency using `Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' })`.

### 3. KPI Cards Component
- Create `components/dashboard/kpi-cards.tsx`.
- Build the 4 cards with the premium styling (icons, progress bars, trend indicators).

### 4. Charts Component
- Create `components/dashboard/dashboard-charts.tsx` as a `'use client'` component.
- **Bar Chart:** Monthly Collections (dummy data for now if no payments exist).
- **Donut Chart:** Payment Methods distribution.
- Add empty states for charts if there's no data.

### 5. Sidebar Update
- Ensure the Sidebar reflects the active page correctly.

## Verification Checklist
- [ ] The dashboard displays real numbers from the database.
- [ ] After a mock payment, refreshing the page updates the Total Collected and the progress bar.
- [ ] The KPI cards look premium (icons, formatting, progress bar).
- [ ] The charts render without errors.
- [ ] No TypeScript or lint errors.