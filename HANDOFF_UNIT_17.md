# HANDOFF — Unit 17: Reconciliation, Manual Entry & Write-Offs

## Repo State (Snapshot at Handoff)
- Branch: `feat/17-reconciliation-writeoffs` (NOT yet committed)
- Working tree: heavily modified — everything from Unit 17 is unstaged
- `main` HEAD: `cea77fe` (post-Unit 16.5 context sync)
- Gate status: `tsc --noEmit` clean, `lint` clean, `build` 27/27 pages
- Database: migrations applied locally. Production NOT yet deployed.

## Unit 17 Goal (Full Scope)
Build a complete reconciliation subsystem handling every financial exception:
1. Unmatched webhook payments — captured, fuzzy-matched, resolved with human confirmation.
2. Offline payments (Cash/Cheque/Bank) — manual entry with Hybrid Allocation.
3. Write-offs — formal accounting treatment of uncollectable debt.

All resolutions use Hybrid Allocation (Auto FIFO preview + manual override), enforce Four-Eyes above KES 20,000, and feed a self-improving Solutions Bank. National Treasurer retains ultimate authority.

## What Is Already Done (Verified via Gate)

### 1. Database Schema & Migrations
- Migration `20261116034805_add_reconciliation_and_writeoffs` — added 4 models + 2 fields
- Migration `add_cheque_payment_method` — added `Cheque` to `PaymentMethod` enum
- New models: `UnmatchedPayment`, `ResolutionPattern`, `WriteOff`, `PendingPayment`
- New fields: `Church.is_defunct`, `Payment.source` ("Webhook" | "Manual" | "Resolved")
- **NOT yet backfilled in production**: `UPDATE "Payment" SET source='Webhook' WHERE source IS NULL`

### 2. Core Utilities
- `lib/utils/matching.ts` — Levenshtein fuzzy + Solutions Bank (`normalizeReference`, `suggestMatches`, `recordResolution`)
- `lib/utils/financial.ts` — added `getNetOutstanding`, `isActiveChurch`, `filterActiveChurches`, `sumApprovedWriteOffs`
- `lib/auth/guards.ts` — added `verifyReconciliationAccess`, `verifyTreasurerAuthority`

### 3. Server Actions
- `lib/actions/reconciliation-actions.ts` — `getUnmatchedQueue`, `resolveUnmatched`, `rejectUnmatched`, `escalateUnmatched`, `getUnresolvedCounts`, `getReconciliationHubStats`, `getSuggestedAllocations`
- `lib/actions/manual-entry-actions.ts` — `createManualEntry`, `getPendingApprovals`, `approvePendingPayment`, `rejectPendingPayment`, `getManualEntryAllocations`
- `lib/actions/writeoff-actions.ts` — `getWriteOffs`, `getChurchOutstandingForWriteOff`, `proposeWriteOff`, `approveWriteOff`, `rejectWriteOff`

### 4. Webhook Update
`app/api/webhooks/kcb/route.ts` — Instead of returning 404 when church not found, now:
- Computes top 3 fuzzy suggestions via `suggestMatches`
- Creates `UnmatchedPayment` record with raw payload + top suggestion + confidence
- Logs `UNMATCHED_PAYMENT_CAPTURED` to AuditLog
- Returns **HTTP 200** (so bank stops retrying)
- Adds `source: 'Webhook'` to successful Payment creation
- Idempotency checks BOTH `Payment.transaction_id` AND `UnmatchedPayment.bank_reference`

### 5. Financial Calculations
- `lib/actions/dashboard-actions.ts` — write-off exclusions (LIFO from aging buckets), defunct church exclusion, new fields (`grossOutstanding`, `totalWrittenOff`, `totalChurchesAll`)
- `lib/actions/scoring-actions.ts` — excludes defunct churches from score denominators, nets outstanding against write-offs

### 6. UI — Navigation
- `components/layout/nav-main.tsx` — added optional `badge` prop with `bg-destructive` red dot
- `components/layout/app-sidebar.tsx` — added Reconciliation tab (Finance/Treasurer/SystemAdmin only) with badge
- `app/dashboard/layout.tsx` — conditionally calls `getUnresolvedCounts()` only for authorized roles

### 7. UI — Pages (5 new)
- `app/dashboard/reconciliation/page.tsx` — hub with 3 cards
- `app/dashboard/reconciliation/unmatched/page.tsx`
- `app/dashboard/reconciliation/manual-entry/page.tsx`
- `app/dashboard/reconciliation/pending-approvals/page.tsx`
- `app/dashboard/reconciliation/write-offs/page.tsx`

### 8. UI — Components (7 new)
- `components/reconciliation/sla-badge.tsx` (green/yellow/red clock badge)
- `components/reconciliation/unmatched-table.tsx`
- `components/reconciliation/resolve-dialog.tsx` (Hybrid Allocation editor)
- `components/reconciliation/reject-dialog.tsx`
- `components/reconciliation/manual-entry-form.tsx`
- `components/reconciliation/pending-approvals-table.tsx`
- `components/reconciliation/writeoff-table.tsx` + `propose-writeoff-dialog.tsx`

### 9. Packages
- `fastest-levenshtein` added to `package.json`
- `components/ui/textarea.tsx` added via `npx shadcn@latest add textarea`

## What Remains (Do NOT commit yet)

### STEP 1: Manual Live Verification (BLOCKING)
Run these 8 tests to verify nothing is silently broken:

**Test 1 — Unmatched Capture**
- POST to `/api/webhooks/kcb` with `BillRefNumber: "CH 005"` (invalid)
- Expect: HTTP 200, `UnmatchedPayment` row created, `UNMATCHED_PAYMENT_CAPTURED` in AuditLog, badge shows "1"

**Test 2 — Fuzzy Suggestion**
- After Test 1, GET `/dashboard/reconciliation/unmatched`
- Expect: suggested match shown (e.g., `CH005` at ~90% confidence)

**Test 3 — Solo Resolution (below 20K)**
- Click Eye → pick church → verify allocation preview → Submit
- Expect: Payment created with `source: 'Resolved'`, unmatched status = `Resolved`, SMS logged, `ResolutionPattern` row created

**Test 4 — Four-Eyes Resolution (above 20K)**
- POST webhook with `TransAmount: 50000` and valid church
- Resolve → should route to `PendingPayment` instead of creating Payment directly
- Expect: UnmatchedPayment notes say "Submitted for Treasurer approval"

**Test 5 — Manual Entry Solo**
- `/dashboard/reconciliation/manual-entry` → create Cash payment for KES 5,000
- Expect: Payment created with `source: 'Manual'`

**Test 6 — Manual Entry Four-Eyes**
- Same form, KES 25,000 → should create PendingPayment
- Treasurer logs in → `/dashboard/reconciliation/pending-approvals` → Approve
- Expect: Payment created, SMS sent

**Test 7 — Write-Off Flow**
- On any church with arrears, propose write-off
- Treasurer approves
- Expect: Church.is_defunct = true (if full amount), Compliance % excludes it, Dashboard `totalWrittenOff` updated

**Test 8 — Solutions Bank Learning**
- Resolve "CH 005" → "CH005" TWICE via two separate webhooks
- Send third webhook with "CH 005"
- Expect: suggestion now shows 70%+ confidence (learned pattern)

### STEP 2: Update Context Files
- `context/progress-tracker.md` — mark Unit 17 complete
- `context/specs/00-build-plan.md` — mark Unit 17 ✅
- `context/architecture.md` — add Section 8 (Unit 17 models)
- `context/code-standards.md` — add reconciliation patterns

### STEP 3: Commit & Push
```bash
git add .
git commit -m "feat(reconciliation): unmatched payments, manual entry, and write-offs (Unit 17)"
git push -u origin feat/17-reconciliation-writeoffs