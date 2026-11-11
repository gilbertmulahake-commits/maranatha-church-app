# Unit 15: Deployment Preparation & Infrastructure

## Goal
Prepare the application for production deployment. This unit focuses on schema expansions (reserving the Pastorate layer and expanding User profiles), setting up the production environment variables, configuring sandbox bank integrations, and upgrading the user profile UI. 

## Design
- **Schema Additions:** Non-breaking. Add `Pastorate` model. Expand `User` with bio-data. Expand `Church` with address/membership.
- **Bank Integrations:** Both KCB (Buni) and Equity (Jenga) will use **sandbox mode**. We will build the `Bank Adapter Pattern` to normalize payloads.
- **UI Updates:** Upgrade the `NavUser` dropdown to an industry-standard avatar/name/role menu.

## Implementation

### Phase 1: Schema Expansion
- Update `prisma/schema.prisma` with the following additions:

```prisma
// Add to existing schema
model Pastorate {
  id             String   @id @default(uuid())
  name           String
  region_id      String
  region         Region   @relation(fields: [region_id], references: [id])
  overseer_name  String?
  contact_phone  String?
  is_active      Boolean  @default(true)
  created_at     DateTime @default(now())
  churches       Church[]
}

model Church {
  // ... existing fields
  pastorate_id     String?
  pastorate        Pastorate? @relation(fields: [pastorate_id], references: [id])
  physical_address String?
  membership_count Int?
}

model User {
  // ... existing fields
  first_name        String?
  last_name         String?
  phone             String?
  profile_photo_url String?
  bio               String?
}
```
- Run `npx prisma7 migrate dev --name add_pastorate_and_biodata`.

### Phase 2: Environment & Deployment Readiness
- Create a production `.env.production` template with placeholders for:
  - `DATABASE_URL` (Supabase Production)
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - `AFRICASTALKING_API_KEY`, `AFRICASTALKING_USERNAME`
  - `KCB_SANDBOX_URL`, `EQUITY_SANDBOX_URL`

### Phase 3: Bank Adapter Engine
- Create `lib/utils/bank-adapter.ts`.
- Define `NormalizedTransaction` type: `bank_reference`, `church_code`, `amount`, `currency`, `payment_method`, `transaction_date`.
- Create functions `normalizeKcbPayload()` and `normalizeEquityPayload()`.
- (Do not connect the real webhooks yet, just build the parsers).

### Phase 4: Africa's Talking Live Integration
- Update `lib/actions/sms-actions.ts`.
- Replace the `console.log` mock with an actual `fetch` call to `https://api.africastalking.com/version1/messaging`.
- Guard it with `if (process.env.NODE_ENV === 'production')` to prevent accidental SMS during local testing.

### Phase 5: Profile UI Upgrade
- Update `components/layout/nav-user.tsx` to show an Avatar (using initials), full name, and role badge.
- Add a "My Profile" link to `/dashboard/settings`.
- (Optional) Build a `/dashboard/profile` page for editing bio-data.

## Verification Checklist
- [ ] Prisma migration succeeds.
- [ ] `Bank Adapter` correctly normalizes both KCB and Equity JSON payloads into the standard type.
- [ ] `sendSms` uses the live Africa's Talking API when `NODE_ENV=production`.
- [ ] `NavUser` dropdown shows the user's name and role badge.
- [ ] `npm run build` passes.