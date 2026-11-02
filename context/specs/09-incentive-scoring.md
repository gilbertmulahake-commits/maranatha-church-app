# Unit 09: Financial Logic & Incentive Scoring Engine

## Goal
Implement the true financial calculation logic (Annual vs Monthly vs Expected-to-Date) and build the Regional Incentive Scoring Engine (40/30/20/10 formula). This unit ensures all dashboards show accurate, fair, and actionable numbers.

## Design
- **Financial Model:** Each church owes KES 11,000/year (5,000 Annual + 6,000 Monthly).
- **Fair Compliance:** A church is "Compliant" if they have paid >= the amount expected *to date* (based on deadlines).
- **Incentive Tiers:** >=90% (Tier 1), >=75% (Tier 2), >=60% (Tier 3), <60% (No Incentive).

## Implementation

### 1. Financial Utility
- Create `lib/utils/financial.ts`.
- `getExpectedToDate(upToDate: Date): { annual: number, monthly: number, total: number }`
  - Annual is added if current date > March 31st of the year.
  - Monthly is calculated as (months elapsed in year) * 500, capped at 12.
- `getChurchStatus(totalPaid: number, expectedToDate: number): 'Paid' | 'Partial' | 'Overdue'`
  - If totalPaid >= expectedToDate -> 'Paid'
  - If totalPaid > 0 but < expectedToDate -> 'Partial'
  - If totalPaid === 0 and date is past deadline -> 'Overdue'

### 2. Update Dashboard Stats (National & Regional)
- Update `getDashboardStats` and `getRegionalStats` to return:
  - `totalExpectedAnnual` (e.g., 1,600 * 5,000 = 8,000,000)
  - `totalExpectedMonthly` (e.g., 1,600 * 6,000 = 9,600,000)
  - `totalCollectedAnnual` (sum of Annual payments)
  - `totalCollectedMonthly` (sum of Monthly payments)
  - `expectedToDate` (sum of expected-to-date for all churches)
  - `compliancePct` = (Churches that paid >= expectedToDate / Total Churches) * 100

### 3. Update UI (KPI Cards)
- **National Dashboard:** Replace "Target Progress" with two cards: "Annual Target" (8M) and "Monthly Target" (9.6M).
- **Regional Dashboard:** Same breakdown.

### 4. Server Action: `getRegionalScores`
- Create `lib/actions/scoring-actions.ts`.
- Calculate:
  - Compliance: Actual % based on the new logic.
  - Timeliness: Mock for now.
  - Reporting: Mock for now.
  - Engagement: Mock for now.
- Calculate Final Score (40/30/20/10) and assign Incentive Tier.

### 5. UI: Regional Leaderboard
- Create `components/dashboard/regional-leaderboard.tsx`.
- Display on National Dashboard.
- Use color-coded tier badges.

### 6. Mock KCB Simulator Update
- Add a "Payment Type" dropdown (Monthly / Annual) to the simulator.
- Update the Webhook to read `payment_type` from the payload instead of inferring from amount.

## Verification Checklist
- [ ] Dashboards show Annual and Monthly expected vs collected.
- [ ] A church that paid 5,000 in January shows as "Paid" (Annual covers it).
- [ ] A church that paid 0 in June shows as "Overdue" (Expected 8,000).
- [ ] Leaderboard correctly ranks regions by Final Score.
- [ ] No TypeScript or lint errors.