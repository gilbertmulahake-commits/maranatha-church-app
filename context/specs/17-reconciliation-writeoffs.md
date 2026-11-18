# Unit 17: Reconciliation, Manual Entry & Write-Offs

## Goal
Build a complete reconciliation subsystem that handles every financial exception in the system:
1. **Unmatched webhook payments** — capture, match (via Levenshtein + Solutions Bank), and resolve through human-in-the-loop confirmation.
2. **Offline payments** — manual entry for Cash, Cheque, and direct Bank Transfers.
3. **Write-offs** — formal accounting treatment of uncollectable bad debts.

All resolutions use **Hybrid Allocation** (auto-preview with manual override), enforce the **Four-Eyes Principle** above KES 20,000, and feed a self-improving **Solutions Bank** (ResolutionPattern table) that learns from every resolution. National Treasurer retains ultimate authority and full visibility. `SYSTEM_ADMIN` can act as Treasurer.

## Design

### Hierarchy & Authority (Locked)
- **National Treasurer:** Can resolve, approve, and write off anything. Ultimate financial authority.
- **Finance Admin:** Can resolve solo below KES 20,000. Above threshold → submits for Treasurer approval. Can propose write-offs but never self-approve.
- **SYSTEM_ADMIN:** Equivalent to Treasurer for financial actions. IT-level oversight.
- **OPERATIONS_ADMIN:** Read-only on reconciliation. Cannot resolve or approve.
- Any resolution touching **90+ day arrears** requires Treasurer approval regardless of amount.

### Sidebar & Navigation
- New standalone **"Reconciliation"** tab (visible only to `FINANCE_ADMIN`, `NATIONAL_TREASURER`, `SYSTEM_ADMIN`).
- Red badge on the sidebar showing count of unresolved items (Pending unmatched + Pending approvals + Pending write-offs). Computed in the layout Server Component for efficiency (~30ms overhead).
- Three sub-pages under Reconciliation:
  - `/dashboard/reconciliation/unmatched` — Unmatched webhook queue
  - `/dashboard/reconciliation/manual-entry` — Manual cash/cheque/bank entry + Pending approvals
  - `/dashboard/reconciliation/write-offs` — Write-off proposals + Pending approvals

### Four-Eyes Threshold Matrix (Locked)
| Operation | Amount / Condition | Solo (Finance Admin) | Requires Treasurer |
|---|---|---|---|
| Unmatched resolution | < KES 20,000 AND no 90+ day arrears | ✅ | — |
| Unmatched resolution | ≥ KES 20,000 OR touches 90+ day arrears | — | ✅ |
| Manual entry | < KES 20,000 | ✅ | — |
| Manual entry | ≥ KES 20,000 | — | ✅ |
| Write-off proposal | Any amount | Propose only | ✅ (always) |

### SLA & Escalation (Locked)
- 🟢 Green: < 7 days unresolved
- 🟡 Yellow: 7–30 days
- 🔴 Red: 30+ days — auto-escalated flag on the item
- 90+ days on arrears: additional warning badge

### Hybrid Allocation (Option C — Locked)
- Every resolution and manual entry shows an **Allocation Preview**.
- Default: FIFO allocations from the existing Allocation Engine.
- Admin can override: manually adjust year/month allocations per row.
- The preview **must** be confirmed before any `Payment` record is created.

### Solutions Bank (Locked)
- `ResolutionPattern` table stores learned patterns.
- Every resolution creates or increments a pattern:
  - `raw_reference_pattern`: "CH 055"
  - `normalized_reference`: "CH055"
  - `resolved_church_code`: "CH0055"
  - `resolution_type`: "Fuzzy" | "Manual" | "Rule"
  - `hit_count`: incremented on repeat
  - `confidence_score`: computed as `min(100, 50 + hit_count * 10)` — 1 hit=60%, 2=70%, 3=80%, 4=90%, 5+=100%
- Before fuzzy matching, the system checks the Solutions Bank.
- Patterns can be manually disabled by SYSTEM_ADMIN.

### Write-Off Accounting Treatment (Locked)
- The expected amount is **never** reduced from `getExpectedUpToDate()` — the obligation existed.
- A `WriteOff` record captures the amount forgiven, reason, proposer, approver, and full notes.
- Compliance calculations exclude written-off amounts from `outstanding`.
- Churches with an approved write-off covering the full arrears get `is_defunct = true`, which excludes them from:
  - Compliance percentages
  - Regional incentive scores
  - SMS reminder lists
- Financial reports must show:
  ```
  Gross Arrears:        KES X
  Less: Written Off:   (KES Y)
  Net Recoverable:      KES Z
  ```

### Pending Payment Staging (Locked)
- The immutable bank ledger never sees a "pending" state.
- High-value manual entries and unmatched resolutions create a `PendingPayment` staging record.
- Only on Treasurer approval is a real `Payment` + `PaymentAllocation` created (inside a `prisma.$transaction`).

### Payment Source Field (Locked)
- Add `source` field to `Payment` model: `"Webhook" | "Manual" | "Resolved"`.
- One-time backfill: `UPDATE Payment SET source='Webhook' WHERE source IS NULL`.
- Enables clean reporting separation going forward.

## Implementation

### Dependencies
- `fastest-levenshtein` (per code-standards.md — target <5ms per comparison)

### 1. Schema Changes (`prisma/schema.prisma`)

```prisma
model UnmatchedPayment {
  id                    String   @id @default(uuid())
  bank_reference        String   @unique
  bank_name             String
  raw_bill_ref          String
  amount                Decimal
  payer_phone           String?
  raw_payload           Json
  status                String   // "Pending" | "Resolved" | "Rejected" | "WrittenOff"
  suggested_church_id   String?
  confidence_score      Float?
  assigned_church_id    String?
  assigned_payment_id   String?
  reviewed_by           String?
  reviewed_at           DateTime?
  notes                 String?
  escalated_at          DateTime?
  created_at            DateTime @default(now())

  suggested_church     Church?  @relation("UnmatchedSuggestedChurch", fields: [suggested_church_id], references: [id])
  assigned_church      Church?  @relation("UnmatchedAssignedChurch", fields: [assigned_church_id], references: [id])
  assigned_payment     Payment? @relation("UnmatchedAssignedPayment", fields: [assigned_payment_id], references: [id])

  @@index([status, created_at])
  @@index([raw_bill_ref])
  @@index([assigned_church_id])
}

model ResolutionPattern {
  id                     String   @id @default(uuid())
  raw_reference_pattern  String
  normalized_reference   String
  resolved_church_code   String
  resolution_type        String   // "Fuzzy" | "Manual" | "Rule"
  hit_count              Int      @default(1)
  confidence_score       Float    @default(50)
  is_active              Boolean  @default(true)
  created_by             String?
  last_used_at           DateTime @default(now())
  created_at             DateTime @default(now())

  @@unique([raw_reference_pattern, resolved_church_code])
  @@index([normalized_reference])
  @@index([is_active, confidence_score])
}

model WriteOff {
  id                String   @id @default(uuid())
  church_id         String
  amount            Decimal
  reason            String   // "DEFUNCT" | "DISSOLVED" | "UNCOLLECTABLE_90D" | "COURT_ORDER" | "OTHER"
  notes             String?
  status            String   // "Pending" | "Approved" | "Rejected"
  proposed_by       String
  proposed_at       DateTime @default(now())
  approved_by       String?
  approved_at       DateTime?
  rejection_reason  String?
  resulting_defunct_flag Boolean @default(false)
  audit_log_id      String?

  church            Church   @relation(fields: [church_id], references: [id])

  @@index([church_id])
  @@index([status])
}

model PendingPayment {
  id                    String   @id @default(uuid())
  proposed_by           String
  proposed_at           DateTime @default(now())
  church_id             String
  amount                Decimal
  payment_method        String   // "Cash" | "Cheque" | "Bank_Transfer"
  transaction_id        String
  payment_date          DateTime
  allocations_json      Json     // Snapshot of proposed allocations for preview
  attachment_url        String?
  notes                 String?
  status                String   // "Pending" | "Approved" | "Rejected"
  reviewed_by           String?
  reviewed_at           DateTime?
  rejection_reason      String?
  resulting_payment_id  String?

  church                Church   @relation(fields: [church_id], references: [id])

  @@index([status])
  @@index([church_id])
}
```

**Enum additions (Church & Payment models):**
```prisma
model Church {
  // ... existing fields
  is_defunct                Boolean  @default(false)
  unmatched_suggested       UnmatchedPayment[] @relation("UnmatchedSuggestedChurch")
  unmatched_assigned        UnmatchedPayment[] @relation("UnmatchedAssignedChurch")
  write_offs                WriteOff[]
  pending_payments          PendingPayment[]
}

model Payment {
  // ... existing fields
  source                    String   @default("Webhook") // "Webhook" | "Manual" | "Resolved"
  unmatched_origin          UnmatchedPayment? @relation("UnmatchedAssignedPayment")
}
```

**Migration:** `npx prisma7 migrate dev --name add_reconciliation_and_writeoffs`

**Backfill:** `UPDATE "Payment" SET source='Webhook' WHERE source IS NULL;`

### 2. Guard Helpers (`lib/auth/guards.ts`)

Add:
```typescript
export async function verifyReconciliationAccess() {
  // SYSTEM_ADMIN, FINANCE_ADMIN, NATIONAL_TREASURER
}

export async function verifyTreasurerAuthority() {
  // SYSTEM_ADMIN, NATIONAL_TREASURER only
  // Used for approving high-value resolutions and write-offs
}
```

### 3. Matching Service (`lib/utils/matching.ts` — new file)

```typescript
import { distance } from 'fastest-levenshtein'

export interface MatchSuggestion {
  church_id: string
  church_code: string
  church_name: string
  confidence: number
  source: 'pattern' | 'fuzzy' | 'manual'
}

export function normalizeReference(ref: string): string {
  // uppercase, trim, strip spaces and dashes
}

export async function suggestMatches(rawRef: string, limit = 3): Promise<MatchSuggestion[]> {
  // 1. Check ResolutionPattern (highest confidence)
  // 2. Run Levenshtein against active church codes
  // 3. Return sorted by confidence desc
}

export async function recordResolution(params: {
  rawReference: string
  resolvedChurchCode: string
  resolutionType: 'Fuzzy' | 'Manual' | 'Rule'
}): Promise<void> {
  // Upsert into ResolutionPattern, increment hit_count, recompute confidence
}
```

### 4. Webhook Update (`app/api/webhooks/kcb/route.ts`)

**Change the "church not found" branch.** Currently returns 404. Now:
1. Compute suggestions via `suggestMatches(BillRefNumber)`
2. Create `UnmatchedPayment` record with `raw_payload`, `amount`, `payer_phone`, top suggestion + confidence
3. Return `{ status: 'unmatched', id }` with HTTP 200 (so the bank doesn't retry — we've captured it)
4. Do NOT send SMS (no church to credit)
5. Do NOT log `PAYMENT_RECEIVED` — this is not a payment, it's an exception. Log `UNMATCHED_PAYMENT_CAPTURED` instead.

### 5. Server Actions (`lib/actions/reconciliation-actions.ts` — new)

- `getUnmatchedQueue()` — returns list with SLA status, age, suggestions
- `resolveUnmatched(unmatchedId, churchId, allocations[])` — creates Payment + Allocations + updates UnmatchedPayment + records ResolutionPattern + sends SMS
- `resolveUnmatchedWithApproval(unmatchedId, churchId, allocations[])` — creates a PendingPayment instead of a Payment
- `rejectUnmatched(unmatchedId, reason)` — marks Rejected, logs to AuditLog
- `escalateUnmatched(unmatchedId)` — manual escalate flag

### 6. Server Actions (`lib/actions/manual-entry-actions.ts` — new)

- `createManualEntry(formData)` — validates, checks threshold, either creates Payment directly (if < 20K) or a PendingPayment
- `getPendingApprovals()` — returns PendingPayment + WriteOff items awaiting Treasurer review
- `approvePendingPayment(id)` — Treasurer approves; converts PendingPayment → real Payment + Allocations; sends SMS; logs audit
- `rejectPendingPayment(id, reason)` — Treasurer rejects

### 7. Server Actions (`lib/actions/writeoff-actions.ts` — new)

- `proposeWriteOff(churchId, amount, reason, notes)` — creates WriteOff (status Pending)
- `approveWriteOff(id)` — Treasurer approves; sets Church.is_defunct if full amount; logs audit
- `rejectWriteOff(id, reason)` — Treasurer rejects

### 8. UI Pages (`app/dashboard/reconciliation/`)

- `page.tsx` — Hub with 3 cards (Unmatched, Pending, Write-offs) + counts + SLA breakdown
- `unmatched/page.tsx` — Server component with Suspense + RBAC gate
- `manual-entry/page.tsx` — Server component with Suspense
- `write-offs/page.tsx` — Server component with Suspense

### 9. UI Components (`components/reconciliation/`)

- `unmatched-table.tsx` — Table with SLA badges, suggested matches, expand-row for raw payload
- `resolve-dialog.tsx` — Hybrid allocation preview + church selector + confirmation
- `manual-entry-form.tsx` — Form with allocation preview + attachment URL field
- `writeoff-table.tsx` — Write-offs with status badges
- `pending-approval-table.tsx` — Treasurer's approval queue
- `sla-badge.tsx` — Reusable SLA indicator (green/yellow/red)

### 10. Financial Calculation Updates (`lib/utils/financial.ts`)

- `getExpectedUpToDate()` — no change (obligation stands)
- Compliance calculators must exclude:
  - Churches with `is_defunct = true` from compliance % denominators
  - Written-off amounts from `outstanding`
- Introduce helper: `getNetOutstanding(church, writeoffs)` — returns gross - writtenOff

### 11. Sidebar Update (`components/layout/app-sidebar.tsx`)

Add to `nationalNav` (between Reports and Audit Logs):
```typescript
if (isFinanceAdmin(role) || role === 'NATIONAL_TREASURER') {
  nationalNav.push({
    title: 'Reconciliation',
    url: '/dashboard/reconciliation',
    icon: IconScale, // or IconRecycle
    badge: <UnresolvedBadge />, // count from getUnresolvedCounts()
  })
}
```

### 12. SMS on Resolution

When a payment is resolved from unmatched or created via manual entry:
- Send the payer/church treasurer the standard Receipt SMS
- Message: same as webhook success message, with the corrected church name
- Method: reuse `sendSms(phone, message, 'Receipt')`

### Files to Create
- `lib/utils/matching.ts`
- `lib/actions/reconciliation-actions.ts`
- `lib/actions/manual-entry-actions.ts`
- `lib/actions/writeoff-actions.ts`
- `app/dashboard/reconciliation/page.tsx`
- `app/dashboard/reconciliation/unmatched/page.tsx`
- `app/dashboard/reconciliation/manual-entry/page.tsx`
- `app/dashboard/reconciliation/write-offs/page.tsx`
- `components/reconciliation/unmatched-table.tsx`
- `components/reconciliation/resolve-dialog.tsx`
- `components/reconciliation/manual-entry-form.tsx`
- `components/reconciliation/writeoff-table.tsx`
- `components/reconciliation/pending-approval-table.tsx`
- `components/reconciliation/sla-badge.tsx`
- `components/reconciliation/unresolved-badge.tsx`

### Files to Modify
- `prisma/schema.prisma` — add 4 models + 2 fields
- `lib/auth/guards.ts` — add `verifyReconciliationAccess`, `verifyTreasurerAuthority`
- `app/api/webhooks/kcb/route.ts` — capture unmatched payments instead of 404
- `lib/utils/financial.ts` — exclude defunct/written-off amounts
- `components/layout/app-sidebar.tsx` — add Reconciliation tab with badge
- `lib/actions/audit-actions.ts` — no change (reuse existing `logAudit`)
- `context/progress-tracker.md` — update progress
- `context/specs/00-build-plan.md` — mark Unit 17 complete, reorder Units 18–22

## Verification Checklist
- [ ] `npx prisma7 migrate dev` applies cleanly
- [ ] Webhook receives invalid `BillRefNumber` → creates `UnmatchedPayment` record with suggestions
- [ ] Levenshtein matching returns correct suggestions for known typos
- [ ] Finance Admin resolves < KES 20,000 → Payment created directly, SMS sent
- [ ] Finance Admin resolves ≥ KES 20,000 → creates PendingPayment, does NOT create Payment
- [ ] Treasurer logs in → sees pending approval → approves → Payment created, SMS sent
- [ ] Treasurer rejects pending → item returns to Finance Admin with reason
- [ ] Manual Entry (Cash/Cheque) < KES 20,000 → Payment created directly
- [ ] Manual Entry ≥ KES 20,000 → PendingPayment created
- [ ] Write-off proposal → status Pending
- [ ] Treasurer approves write-off → Church.is_defunct updated if full amount, compliance excludes the church
- [ ] Written-off amounts excluded from regional leaderboard scores
- [ ] SMS reminder lists exclude defunct churches
- [ ] Solutions Bank learns: resolve "CH 055" → "CH0055" twice → third time auto-suggests with 70%+ confidence
- [ ] Sidebar shows red badge with unresolved count
- [ ] SLA badges show correct color (green <7, yellow 7-30, red 30+)
- [ ] 90+ day arrears resolution always routes to Treasurer approval
- [ ] All resolutions logged to AuditLog with full `beforeData`/`afterData`/`metadata`
- [ ] `npx tsc --noEmit` passes cleanly
- [ ] `npm run lint` passes cleanly (no warnings)
- [ ] `npm run build` passes (22 → 25 pages, +3 for reconciliation sub-pages)
- [ ] Invariants in `architecture.md` still hold:
  - Invariant #5 (Reconciliation Mapping): Now formalized via `UnmatchedPayment`
  - Invariant #6 (Atomic Financial Mutations): All Payment creation wrapped in `prisma.$transaction`
  - Invariant #7 (Arrears Aging): Unchanged, but now write-offs excluded