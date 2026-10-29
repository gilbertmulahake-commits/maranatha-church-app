# Unit 05: Mock KCB Webhook & Payment Reconciliation

## Goal
Build a secure API endpoint that simulates receiving real-time payment webhooks from KCB Bank. Implement the core reconciliation engine that matches the incoming `BillRefNumber` (Church ID) to the correct church in the database. If successful, record the payment. If unmatched, flag it for manual review.

## Design
- **Mock Simulator:** Since we don't have live KCB credentials, we will build a "Developer Tool" on the dashboard (e.g., a page at `/dashboard/mock-kcb`) that lets us simulate a payment. It will send a POST request to our webhook endpoint with a fake payload.
- **Webhook Endpoint:** A Next.js Route Handler at `app/api/webhooks/kcb/route.ts` that receives the POST request, validates it, and processes it.
- **Reconciliation Logic:** 
  - Extract `BillRefNumber` (Church ID) and `TransAmount` (Amount) from the payload.
  - Find the church by `church_code`.
  - If found: Create a `Payment` record with status `Paid`.
  - If not found: We need a place to store unmatched payments. For this MVP, we will log it and return an error, but in a production system, it would go to an `UnmatchedPayment` table.

## Implementation

### Dependencies
- `zod` (for validating the incoming webhook payload)

### 1. Webhook Route Handler
- Create `app/api/webhooks/kcb/route.ts`.
- Validate the incoming request body using Zod.
- Extract `BillRefNumber`, `TransAmount`, `TransID`, `TransTime`, and `MSISDN` (phone number).
- Implement the reconciliation logic:
  - Query Prisma for a `Church` where `church_code` matches `BillRefNumber`.
  - If found, create a `Payment` record.
  - Return a `200 OK` response.

### 2. Mock KCB Simulator Page
- Create `app/dashboard/mock-kcb/page.tsx`.
- Build a simple form with:
  - Church ID (e.g., "CH001")
  - Amount (e.g., "5000")
  - Phone Number (e.g., "0712345678")
- On submit, send a POST request to `/api/webhooks/kcb` with a payload formatted like a real KCB webhook.
- Display a success or error message based on the response.
- Add a link to this page in the sidebar for easy testing.

### 3. Sidebar Update
- Add a "Mock KCB" link to `components/layout/sidebar.tsx` so we can access the simulator.

## Verification Checklist
- [ ] Navigating to `/dashboard/mock-kcb` shows the simulator form.
- [ ] Submitting a payment for an existing Church ID (e.g., `CH001`) returns a success message and creates a `Payment` record in Supabase.
- [ ] Submitting a payment for a non-existent Church ID returns an error message (simulating an unmatched payment).
- [ ] No TypeScript or lint errors.