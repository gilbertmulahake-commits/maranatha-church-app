# Unit 19: Guided Payment Flow (Pay Now Wizard)

## Goal

A church treasurer can pay their outstanding Annual or Monthly contribution through a guided, in-dashboard wizard that either (a) initiates a bank-issued STK Push via **KCB Buni** or **Equity Jenga**, or (b) walks them through manual payment via any banking app. In both cases the `Payment` ledger is written **only** by the bank's confirmation channel (KCB callback, Jenga IPN, or the existing C2B webhook), never by an initiation response or a client button. The wizard polls a server-side status action that asks the correct provider for the truth, and the intent's lifecycle is bounded to 30 minutes.

## Design

### Scope phases (per prior sign-off S1)

Unit 19 is delivered in three phases with a hard gate between each:

| Phase | Scope | External dependency |
|---|---|---|
| **19a** | `PaymentIntent` v2 schema + migration | None |
| **19b** | Guard, constants, manual-channel wizard, polling | None |
| **19c** | KCB Buni + Equity Jenga STK Push adapters, callback routes, provider status queries | Both banks' sandboxes |
| **19d → Unit 19.5** | Go-live | Bank approvals |

19a and 19b are shipped before any bank credential exists. 19c is built entirely against sandboxes. 19d is blocked and is not part of this spec.

### Wizard shape (⚠️ SA1 — re-confirm)

**Chosen:** `<Dialog>` opened from the Local Church Dashboard. Page count remains **28/28**.

Rationale unchanged: `getLocalChurchStats()` is already loaded; zero extra server round-trip; fits the "Wide" dialog standard (`w-[95vw] sm:w-full sm:max-w-[600px] p-6 max-h-[90vh] overflow-y-auto`).

**Alternative:** dedicated route `/dashboard/local/pay` (page count 29/29). If you prefer this, replace the integration sub-section below with a route file following the `ChurchesPage` Suspense pattern.

### Visual language

- All currency via `formatCurrency` from `lib/utils.ts`; dates via `formatDate` / `formatDateTime` (Africa/Nairobi).
- Paybill, account (`churchCode`), amount, `provider_receipt`, and any `transaction_id` rendered `font-mono` (`ui-context.md` § 3) — matches the existing `<Badge variant="outline" className="font-mono">{stats.churchCode}</Badge>` on the dashboard header.
- Step indicator (`components/payments/wizard-step-indicator.tsx`): five `w-6 h-1` hairlines and dots. Completed `bg-primary`, current `bg-primary` with `ring-2 ring-primary/30`, future `bg-muted`. Labels `text-paragraph-small text-muted-foreground`. **No new `components/ui/` primitive** (protected).
- Bucket cards (Step 1): two `rounded-xl border border-border bg-card p-4` cards. Selected → `border-primary ring-1 ring-primary/30`. Each shows bucket name, status pill (`Paid` emerald / `Partial` amber / `Overdue` red / `N/A` gray), outstanding in `text-heading-4 font-bold tabular-nums`, and a `Recommended` pill (`bg-primary/10 text-primary`) on the card that FIFO would address first.
- Channel radio (Step 3): `<RadioGroup>` from `components/ui/radio-group.tsx` (verify exists; else use two `rounded-lg` label-wrapped `<input type="radio">` styled with tokens — no new `ui/` component).
- Instructions `<ol className="space-y-3 text-paragraph-small">` with numbered circles `inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold`. Copy buttons `<Button variant="outline" size="sm" className="h-7 px-2">` with `<Copy className="h-3 w-3 mr-1" />`; on click → Sonner toast `"Copied"`.
- Polling indicator (Step 4): `<Loader2 className="h-5 w-5 animate-spin text-primary" />` + `"Waiting for payment confirmation…"` + countdown in mono.
- Result (Step 5):
  - **Paid**: `text-emerald-600` heading, `<CheckCircle2 />`, allocation summary in `<TableShell>` if allocations exist.
  - **Unmatched**: `text-amber-600` heading, `<AlertCircle />`, copy: *"We received a payment matching your amount, but the reference did not resolve to a church. HQ will reconcile it — you do not need to pay again."*
  - **Failed** (provider returned a failure code): `text-destructive` heading, `<XCircle />`, provider reason, "Try again" + "Close".
  - **Expired**: `text-muted-foreground`, `<Clock />`, "Try again" + "Close".
- Closing the dialog on Step 3/4 without clicking Cancel leaves the intent `Active` — it auto-expires. Cancel button calls `abandonPaymentIntent` then `onOpenChange(false)` with **no `AlertDialog`** (soft cancel, not destructive).

### Priority display (per user request)

Step 1 shows both buckets ordered by priority. **Priority rule (from existing allocation engine semantics):**
1. `Overdue` before `Partial` before `Paid` before `N/A`.
2. If tied, larger outstanding first.
3. Recommended card carries a `Recommended` pill.

This is *display only* — the allocation engine on the backend still applies FIFO across periods. The wizard does not override it.

### Step breakdown

| # | Name | Content |
|---|---|---|
| 1 | Select bucket | Two cards, priority-labelled, status pills, outstanding. Selection persists. |
| 2 | Confirm amount | Bucket badge. `<Input type="number">` prefilled with outstanding (empty if 0, to allow prepayment). Quick-fill buttons ("Pay full outstanding", "Pay KES 500", "Pay KES 5,000"). Client-side validation `> 0`, `≤ PAYMENT_INTENT_AMOUNT_CEILING`. "Continue" creates `PaymentIntent`. |
| 3 | Channel | If STK Push available → two `<RadioGroup>` options: **"Pay now via STK Push (fast)"** (default) and **"Pay in my banking app"**. If unavailable → skip to Step 4 with manual instructions. Continue triggers either STK initiation (Step 4 auto) or manual instructions (Step 4 manual). |
| 4a | STK pending | "A PIN prompt has been sent to your phone. Enter your M-Pesa PIN to confirm." Cancel button (`abandon`). Auto-advances to Step 5 on provider terminal state. |
| 4b | Manual instructions | Per-app instructions: **M-Pesa app** (paybill + account + amount), **KCB app** (Business No. + account), **Equity app** (Pay Bill + account). Each has copy buttons. "I have paid" button → starts polling → Step 5. |
| 5 | Result | Paid / Unmatched / Failed / Expired branch as above. |

Countdown (`intent.expires_at − now`) is client-derived; no server round-trip.

### Channel availability rule

Wizard computes at render:
- **Manual** — always available.
- **KCB Buni STK** — available if `PAYMENT_PROVIDER_MODE` ≠ `disabled` AND `KCB_BUNI_ORG_SHORTCODE` and credentials present.
- **Equity Jenga STK** — available if credentials + `JENGA_MERCHANT_CODE` present.

If neither STK is available → Step 3 skipped, Step 4b direct. If one or both are available → Step 3 shown.

**The user does not choose which bank** — the church's assigned bank is a system property, not a wizard property. The wizard offers "STK Push" generically; the adapter factory picks KCB or Jenga based on the client's configuration. **This is a design decision: no dual-bank routing per church in v1.** If the Ministry later has churches paying into different banks, that is a separate unit.

---

## Implementation

### Dependencies

**No new npm packages.** KCB OAuth uses built-in `fetch`. Jenga RSA signing uses `node:crypto` (`createSign('RSA-SHA256')`). All UI uses existing shadcn primitives and `lucide-react`.

One thing to verify before 19c begins: `components/ui/radio-group.tsx` exists. If it does not, do **not** add it to `components/ui/` (protected) — implement inline `input[type=radio]` styled with tokens inside `pay-now-wizard.tsx`.

### 19a — Schema & Migration

New model and enum in `prisma/schema.prisma`:

```prisma
enum PaymentIntentStatus {
  Active
  Matched
  Unmatched
  Expired
  Abandoned
}

enum PaymentIntentChannel {
  Manual
  KCB_Buni
  Equity_Jenga
}

model PaymentIntent {
  id                    String                 @id @default(uuid())
  church_id             String
  church                Church                 @relation(fields: [church_id], references: [id])
  amount                Decimal
  payment_type          PaymentType
  channel               PaymentIntentChannel   @default(Manual)
  status                PaymentIntentStatus    @default(Active)

  // Provider tracking (null for Manual)
  provider_request_id   String?
  provider_receipt      String?                @unique
  provider_result_code  String?
  raw_callback          Json?

  // Matching
  matched_payment_id    String?                @unique
  matched_unmatched_id  String?                @unique
  matched_at            DateTime?

  // Forensics
  raw_bill_ref_entered  String?
  created_by            String
  expires_at            DateTime
  abandoned_at          DateTime?
  created_at            DateTime               @default(now())

  @@index([church_id, status])
  @@index([expires_at])
  @@index([channel, status])
  @@index([provider_request_id])
}
```

Back-relation on `Church`:
```prisma
payment_intents PaymentIntent[]
```

Two composite indexes on existing tables (additive; required by the 19b polling query):

```prisma
// model Payment
@@index([church_id, created_at])

// model UnmatchedPayment
@@index([amount, created_at])
```

**Migration sequence:**
1. `npx prisma7 migrate dev --name add_payment_intent`
2. `npx prisma7 generate`
3. Commit the generated migration folder (`prisma/migrations/<ts>_add_payment_intent/`)

No `db push`, no `migrate reset`. Back up first per `code-standards.md`.

**Doc-sync (same session):** confirm `architecture.md` § 8 (`PaymentIntent` v2) matches the actual schema exactly. If the patch left it subtly out of sync, correct it now.

### 19b — Guard & Constants

**New guard** appended to `lib/auth/guards.ts`, following the identical preamble of the existing five:

```ts
import type { Role } from '@prisma/client'

const CHURCH_SCOPED_ROLES: Role[] = ['CHURCH_TREASURER', 'LOCAL_PASTOR']
const FINANCE_ROLES: Role[]      = ['FINANCE_ADMIN', 'NATIONAL_TREASURER', 'SYSTEM_ADMIN']

export async function verifyChurchPaymentAccess(churchId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  if (!dbUser) throw new Error('User not found')

  if (FINANCE_ROLES.includes(dbUser.role)) {
    return { actorId: user.id, actorEmail: user.email, actorRole: dbUser.role, dbUser }
  }
  if (CHURCH_SCOPED_ROLES.includes(dbUser.role) && dbUser.church_id === churchId) {
    return { actorId: user.id, actorEmail: user.email, actorRole: dbUser.role, dbUser }
  }
  throw new Error('Forbidden: Requires church-scoped or finance-level access')
}
```

**Constants** appended to `lib/constants.ts`:

```ts
export const PAYMENT_INTENT_EXPIRY_MINUTES   = 30
export const PAYMENT_INTENT_POLL_INTERVAL_MS = 5000
export const PAYMENT_INTENT_GRACE_SECONDS    = 60
export const PAYMENT_INTENT_AMOUNT_CEILING   = 500_000
```

### 19b — Server Actions (`lib/actions/payment-intent-actions.ts`, new file)

`'use server'` at top. Three actions; all return `{ error } | { data }` per house shape.

**`createPaymentIntent(formData: FormData)`**
- `verifyChurchPaymentAccess(churchId)` at top of `try`.
- Zod: `churchId: z.string().uuid()`, `amount: z.coerce.number().positive().lte(PAYMENT_INTENT_AMOUNT_CEILING)`, `paymentType: z.enum(['Annual', 'Monthly'])`, `rawBillRef: z.string().min(1)`.
- Server-side re-check: for church-scoped roles, `rawBillRef` must equal `dbUser.church.church_code` — else `{ error: 'Church code mismatch' }`.
- Insert `PaymentIntent` with `channel: 'Manual'`, `status: 'Active'`, `expires_at: new Date(Date.now() + 30 * 60_000)`.
- Returns `{ intentId, expiresAt }`.
- **No `$transaction`** — single-row write.

**`pollPaymentIntent(intentId: string)`**
- Load intent → `verifyChurchPaymentAccess(intent.church_id)`.
- If `status !== 'Active'` → return current state.
- If `now > expires_at` → single-row update to `Expired`, return `{ status: 'Expired' }`.
- Otherwise dispatch by `channel`:
  - **`Manual`** → within `prisma.$transaction`:
    1. Query `Payment` where `church_id = intent.church_id`, `amount_paid.equals(intent.amount)`, `status = 'Paid'`, `source = 'Webhook'`, `payment_method = 'M_Pesa'`, `created_at ∈ [intent.created_at − 60s, intent.expires_at]`, and `id NOT IN (SELECT matched_payment_id FROM PaymentIntent WHERE matched_payment_id IS NOT NULL)`.
    2. If found → update intent to `{ status: 'Matched', matched_payment_id, matched_at: now }`, return `{ status: 'Matched', payment: { transactionId, amount, allocations } }`.
    3. Else query `UnmatchedPayment` where `status = 'Pending'`, `amount.equals(intent.amount)`, `created_at ∈ [window]`, `id NOT IN (SELECT matched_unmatched_id …)`. If found → update to `Unmatched`, return `{ status: 'Unmatched' }`.
    4. Else → `{ status: 'Active' }`.
  - **`KCB_Buni` / `Equity_Jenga`** → delegate to `verifyProviderStk(intent)` (implemented in 19c), which itself falls back to the manual check if the provider returns `Unknown`.
- Post-transaction (never inside): `logAudit({ action: 'PAYMENT_INTENT_MATCHED' | 'PAYMENT_INTENT_UNMATCHED' | 'PAYMENT_INTENT_EXPIRED', ... })`.

**`abandonPaymentIntent(intentId: string)`**
- `verifyChurchPaymentAccess(intent.church_id)`.
- If `status === 'Active'` → update to `{ status: 'Abandoned', abandoned_at: now }`.
- Idempotent: abandoning a terminal intent is a no-op returning `{ success: true }`.

**ESLint discipline:** no `any`; Zod narrows. `void` unused params. No client-side assumptions leaked into the action.

### 19b — Wizard Component

**`components/payments/pay-now-wizard.tsx`** (`'use client'`)

State:
```ts
type Step = 1 | 2 | 3 | 4 | 5
type Result =
  | { kind: 'Matched'; payment: { transactionId: string; amount: number; allocations: { type: string; year: number; month: number | null; amount: number }[] } }
  | { kind: 'Unmatched' }
  | { kind: 'Failed'; reason: string }
  | { kind: 'Expired' }

const [step, setStep] = useState<Step>(1)
const [bucket, setBucket] = useState<'Annual' | 'Monthly'>('Annual')
const [amount, setAmount] = useState('')
const [channel, setChannel] = useState<'Manual' | 'STK'>('Manual')
const [intentId, setIntentId] = useState<string | null>(null)
const [expiresAt, setExpiresAt] = useState<Date | null>(null)
const [result, setResult] = useState<Result | null>(null)
const [isLoading, setIsLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
```

Props: `{ stats: LocalChurchStats; open: boolean; onOpenChange: (open: boolean) => void }`.

**Countdown** via `useSyncExternalStore` or an effect that only schedules `setInterval` (the interval callback does the `setState`, never the effect body). **Satisfies `react-hooks/set-state-in-effect`.**

**Polling** — effect scoped to `step === 4 && intentId`:
```ts
useEffect(() => {
  if (step !== 4 || !intentId) return
  let cancelled = false
  const tick = async () => {
    const r = await pollPaymentIntent(intentId)
    if (cancelled || !r || 'error' in r) return
    if (r.status === 'Matched') { setResult({ kind: 'Matched', payment: r.payment }); setStep(5) }
    else if (r.status === 'Unmatched') { setResult({ kind: 'Unmatched' }); setStep(5) }
    else if (r.status === 'Expired') { setResult({ kind: 'Expired' }); setStep(5) }
  }
  const id = setInterval(tick, PAYMENT_INTENT_POLL_INTERVAL_MS)
  tick()
  return () => { cancelled = true; clearInterval(id) }
}, [step, intentId])
```
`tick()` is async — `setState` occurs in the promise chain, not synchronously. **Rule satisfied.**

**Cancel:**
```ts
async function handleCancel() {
  if (intentId) await abandonPaymentIntent(intentId)
  onOpenChange(false)
}
```

Dialog: `<Dialog open={open} onOpenChange={onOpenChange}>`. Closing without Cancel does **not** reset or abandon — the intent expires naturally. Reopening starts at Step 1.

### 19b — Step Indicator

**`components/payments/wizard-step-indicator.tsx`** — pure presentational, no `'use client'`. Props `{ current: 1..5; labels: string[] }`. Renders the five-dot row per Design.

### 19b — Integration (`components/local/local-dashboard-client.tsx`, modify)

Add:
```tsx
const [wizardOpen, setWizardOpen] = useState(false)

<div className="flex justify-end">
  <Button onClick={() => setWizardOpen(true)} className="bg-primary hover:bg-primary/90">
    <Plus className="mr-2 h-4 w-4" />
    Pay Now
  </Button>
</div>

<PayNowWizard stats={stats} open={wizardOpen} onOpenChange={setWizardOpen} />
```

### 19b — Environment

`.env.example` additions:
```
# Manual channel — the M-Pesa Paybill number for the manual instructions
NEXT_PUBLIC_MPESA_PAYBILL_NUMBER=123456

# Provider mode master switch (sandbox | live | disabled)
PAYMENT_PROVIDER_MODE=sandbox

# KCB Buni sandbox
KCB_BUNI_CONSUMER_KEY=
KCB_BUNI_CONSUMER_SECRET=
KCB_BUNI_ORG_SHORTCODE=522522
NEXT_PUBLIC_KCB_PAYBILL_NUMBER=522522

# Equity Jenga sandbox
JENGA_MERCHANT_CODE=
JENGA_API_KEY=
JENGA_CONSUMER_SECRET=
JENGA_PRIVATE_KEY_PEM=
NEXT_PUBLIC_EQUITY_PAYBILL_NUMBER=
```

(⚠️ **SA2** — confirm three separate paybill env vars, not a single one. Manual Paybill may differ from either bank's, depending on the client's actual bank. **SA3** — Jenga key as PEM in env var, never committed.)

### 19c — Provider Adapter Contract (`lib/payments/providers/types.ts`, new)

```ts
export type StkPushRequest = {
  phone: string          // E.164 or 2547…
  amount: number
  reference: string      // intent id — provider sees it as orderReference/paymentReference
  description: string
  callbackUrl: string
}

export type StkPushResult =
  | { ok: true;  providerRequestId: string; providerResultCode: string }
  | { ok: false; providerResultCode: string; message: string }

export type StkStatusResult =
  | { state: 'Pending' }
  | { state: 'Paid';    receipt: string; amount: number; phone: string }
  | { state: 'Failed';  code: string;   reason: string }
  | { state: 'Unknown'; code: string }

export interface PaymentProvider {
  channel: 'KCB_Buni' | 'Equity_Jenga'
  initiate(req: StkPushRequest): Promise<StkPushResult>
  query(intent: { provider_request_id: string; created_at: Date }): Promise<StkStatusResult>
  normaliseCallback(raw: unknown): 
    | { state: 'Paid';    receipt: string; amount: number; phone: string }
    | { state: 'Failed';  code: string;   reason: string }
    | { state: 'Pending' }
}
```

### 19c — KCB Buni Adapter (`lib/payments/providers/kcb-buni.ts`, new)

- **Auth:** `POST https://${host}/token?grant_type=client_credentials` with `Authorization: Basic base64(key:secret)`. Cache token in module scope `{ token, expiresAt }` for `3599s − 60s`. Cache works in warm serverless; cold starts re-fetch.
- **Initiate:** `POST ${host}/mm/api/request/1.0.0/stkpush`, body `{ phoneNumber, amount, invoiceNumber, sharedShortCode: true, orgShortCode, callbackUrl, transactionDescription }`.
- **Query:** `POST ${host}/mm/api/request/1.0.0/stkquery` with `{ checkoutRequestID }`. **Treat HTTP 500 and unknown response codes as `Unknown`** — never `Failed` (per KCB sandbox quirk).
- **Callback normalise:** maps `ResultCode: "0"` → `Paid` (receipt from `CallbackMetadata`), `"1032"` / `"1031"` / `"1037"` → `Failed`, anything else → `Pending`.

### 19c — Equity Jenga Adapter (`lib/payments/providers/equity-jenga.ts`, new)

- **Auth:** JWT from JengaHQ authenticate endpoint with merchant code + consumer secret + signed payload. Cache ~3500s.
- **Signing:** `node:crypto` — `createSign('RSA-SHA256').update(payload).sign(PRIVATE_KEY_PEM, 'base64')`. The exact payload string for the signature header is `base64UrlEncode(orderReference) + base64UrlEncode(paymentCurrency) + base64UrlEncode(msisdn) + base64UrlEncode(paymentAmount)`. **Verify against Equity docs at implementation time**; if the docs define a different concat order, follow the docs.
- **Initiate:** `POST ${host}/api-checkout/mpesa-stk-push/v3.0/init` with the nested `{ order, customer, payment }` body; `payment.callbackUrl` is the STK callback route.
- **Query:** `GET ${host}/api-checkout/mpesa-stk-push/v3.0/status/order/{orderReference}`. Unknown codes → `Unknown`.
- **Callback normalise:** The **IPN** (complete callback) is the truth source per Jenga's own guidance. The STK callback is informational. `normaliseCallback` accepts both payload shapes and returns `Paid` only from the IPN.

### 19c — Ledger Writer (`lib/payments/ledger-writer.ts`, new)

**The single writer of `Payment` rows from any STK channel.** Contract:

```ts
export async function writeSettledStkPayment(input: {
  provider: 'KCB_Buni' | 'Equity_Jenga'
  intentId: string
  receipt: string
  amount: number
  phone: string
}): Promise<{ paymentId: string } | { skipped: 'already_recorded' | 'unknown_intent' }>
```

Rules:
1. Load the intent (`PaymentIntent.id = intentId`). If not found → `{ skipped: 'unknown_intent' }`.
2. Inside `prisma.$transaction`:
   - `prisma.payment.upsert` keyed by `transaction_id = receipt` (unique). If it existed with the same amount → treat as no-op.
   - Create `PaymentAllocation[]` via `calculateAllocations` using the same FIFO path as the webhook.
   - `tx.paymentIntent.update` to `{ status: 'Matched', provider_receipt: receipt, matched_payment_id: payment.id, matched_at: now }`.
3. Post-commit: `logAudit({ action: 'PAYMENT_RECEIVED', entity: 'Payment', ... })`.
4. **Never write a `Payment` for an intent whose `status` is not `Active`.**

The webhook and the ledger writer **share** the allocation engine — the writer imports `computeExpectedPeriods` and `calculateAllocations` from `lib/utils/allocation.ts`. No re-derivation.

### 19c — Callback Routes (three files, no dynamic route)

- **`app/api/webhooks/payments/kcb-buni/stk-callback/route.ts`** — POST. Verify against a KCB IP allowlist (env `KCB_CALLBACK_ALLOWED_IPS`, comma-separated; if empty, log a warning and proceed — sandbox has no fixed IPs). Parse, `normaliseCallback`, then call `writeSettledStkPayment`. Return `200` within ~2s — do not allocate or SMS in the callback.
- **`app/api/webhooks/payments/equity-jenga/stk-callback/route.ts`** — POST. Informational only; store `raw_callback`, do **not** write `Payment`.
- **`app/api/webhooks/payments/equity-jenga/ipn/route.ts`** — POST. The truth channel for Jenga. Verify the IPN signature header if Equity provides one, else IP allowlist. Call `writeSettledStkPayment`.

All three routes:
- Zod-validate body.
- Idempotent — `writeSettledStkPayment` handles duplicates via `Payment.transaction_id` uniqueness.
- Return `200` even for duplicates (bank may retry).
- Route does **not** run allocation / SMS inline — offload to `jobs/` if the settlement is complex.

### 19c — STK Initiation Action (extend `lib/actions/payment-intent-actions.ts`)

New action `initiateStkPayment(formData: FormData)`:
- `verifyChurchPaymentAccess(churchId)`.
- Zod: `churchId`, `amount`, `paymentType`, `phone` (E.164).
- Load `dbUser.church` — determine provider from **client config**, not from the request. If `PAYMENT_PROVIDER_MODE === 'disabled'` → `{ error: 'STK Push not configured' }`.
- Create `PaymentIntent` with `channel = 'KCB_Buni' | 'Equity_Jenga'` based on client config.
- Call `getProvider(channel).initiate(...)`.
- On `ok: true` → update intent `{ provider_request_id, provider_result_code, status: 'Active' }`. Return `{ intentId, expiresAt }`.
- On `ok: false` → mark intent `Abandoned`, return `{ error: message }`.
- **Never** write a `Payment` from this action.

### 19c — Wizard integration

- Step 3 shows channel options iff `channelAvailable('KCB_Buni') || channelAvailable('Equity_Jenga')`.
- If STK selected → `initiateStkPayment`; on success, `setIntentId` and go to Step 4a (pending). On failure, fall back to Step 4b (manual) with a toast.
- Step 4a shows the polling spinner and a Cancel button; auto-advances on provider terminal state.
- Step 4b (manual) unchanged from 19b.

### 19d — Unit 19.5 (out of scope of this spec)

Production credentials, `PAYMENT_PROVIDER_MODE=live`, IP-allowlist callbacks, rate-limit monitoring. Blocked on KCB Go-Live and Jenga Live Onboarding. Tracked in `progress-tracker.md` → Next Up.

### Files to create / modify

**19a:**
- `prisma/schema.prisma` — add `PaymentIntent`, two enums, `Church.payment_intents`, two composite indexes
- `prisma/migrations/<ts>_add_payment_intent/` — generated
- `context/architecture.md` § 8 — verify consistency post-patch

**19b:**
- `lib/constants.ts` — four `PAYMENT_INTENT_*` constants
- `lib/auth/guards.ts` — `verifyChurchPaymentAccess`
- `lib/actions/payment-intent-actions.ts` — new; `createPaymentIntent`, `pollPaymentIntent` (Manual branch), `abandonPaymentIntent`
- `components/payments/pay-now-wizard.tsx` — new
- `components/payments/wizard-step-indicator.tsx` — new
- `components/local/local-dashboard-client.tsx` — Pay Now button + wizard mount
- `.env.example` — manual paybill + provider mode + placeholder for KCB/Jenga (unused until 19c)

**19c:**
- `lib/payments/providers/types.ts` — new
- `lib/payments/providers/kcb-buni.ts` — new
- `lib/payments/providers/equity-jenga.ts` — new
- `lib/payments/payment-provider.ts` — new (factory)
- `lib/payments/ledger-writer.ts` — new
- `lib/actions/payment-intent-actions.ts` — extend with `initiateStkPayment`, provider-aware `pollPaymentIntent`
- `app/api/webhooks/payments/kcb-buni/stk-callback/route.ts` — new
- `app/api/webhooks/payments/equity-jenga/stk-callback/route.ts` — new
- `app/api/webhooks/payments/equity-jenga/ipn/route.ts` — new
- `components/payments/pay-now-wizard.tsx` — add channel selection + 4a state
- `.env.example` — fill KCB/Jenga credential slots

---

## Verification Checklist

### 19a — Schema gate (do not proceed to 19b until clean)

- [ ] `PaymentIntent` model matches the field list above exactly
- [ ] `PaymentIntentStatus` and `PaymentIntentChannel` enums present with correct values
- [ ] Back-relation `Church.payment_intents PaymentIntent[]` added
- [ ] `Payment(church_id, created_at)` and `UnmatchedPayment(amount, created_at)` indexes added
- [ ] `@@unique([provider_receipt])` present and sparse
- [ ] `npx prisma7 migrate dev --name add_payment_intent` applied cleanly
- [ ] `npx prisma7 generate` succeeded; `PaymentIntent` type appears in generated client
- [ ] `prisma7 migrate status` — 0 pending, no drift
- [ ] `npx tsc --noEmit` clean (run `npx next typegen` first on cold cache)
- [ ] `architecture.md` § 8 matches schema exactly (field-by-field)

**⏸ Gate: no 19b work until every 19a box is ticked.**

### 19b — Guard & constants

- [ ] `verifyChurchPaymentAccess(otherChurchId)` throws `Forbidden` for `CHURCH_TREASURER` / `LOCAL_PASTOR` of a different church
- [ ] `verifyChurchPaymentAccess(ownChurchId)` succeeds for `CHURCH_TREASURER` and `LOCAL_PASTOR`
- [ ] `verifyChurchPaymentAccess(anyChurchId)` succeeds for `FINANCE_ADMIN` / `NATIONAL_TREASURER` / `SYSTEM_ADMIN`
- [ ] `verifyChurchPaymentAccess` throws `Unauthorized` when no session
- [ ] Four constants in `lib/constants.ts`; grep for `30`, `5000`, `500_000` in the wizard and actions → zero inline occurrences

### 19b — Manual actions

- [ ] `createPaymentIntent` rejects `amount <= 0`, `amount > 500_000`, non-UUID `churchId`
- [ ] `createPaymentIntent` rejects a church-scoped caller with a mismatched `rawBillRef`
- [ ] Successful create writes `status='Active'`, `channel='Manual'`, `expires_at ≈ now + 30min`
- [ ] `pollPaymentIntent` on unknown intent returns error without side effect
- [ ] `pollPaymentIntent` on already-`Matched` intent returns current state without re-matching
- [ ] `pollPaymentIntent` on expired `Active` intent transitions to `Expired`
- [ ] `pollPaymentIntent` finds a `Payment` created within `[start − 60s, expires_at]` and matching amount → transitions to `Matched` and sets `matched_payment_id`, `matched_at`
- [ ] `pollPaymentIntent` finds an `UnmatchedPayment` with matching amount in window → transitions to `Unmatched` and sets `matched_unmatched_id`, `matched_at`
- [ ] Two intents for the same church/amount do **not** claim the same `Payment` — second intent sees `Active` and either expires or matches a different one
- [ ] `pollPaymentIntent` writes `PAYMENT_INTENT_MATCHED` / `PAYMENT_INTENT_UNMATCHED` / `PAYMENT_INTENT_EXPIRED` audit rows **after** the transaction commits (verify via `AuditLog` table)
- [ ] `abandonPaymentIntent` sets `Abandoned` + `abandoned_at`; callable twice without error
- [ ] `abandonPaymentIntent` on `Matched` intent does not downgrade the status

### 19b — Wizard UI

- [ ] "Pay Now" button visible on `/dashboard/local` for church-scoped roles
- [ ] Wizard renders 5-step indicator with correct highlight
- [ ] Step 1 shows both bucket cards, priority-labelled, correct status pills
- [ ] Step 2 prefills outstanding; empty when outstanding = 0
- [ ] Step 2 client-side validation blocks `0`, `-1`, `500_001`
- [ ] Step 2 quick-fill buttons populate correctly
- [ ] Step 3 (no STK available) skipped — goes directly to Step 4b
- [ ] Step 4b renders paybill, account, amount in `font-mono`
- [ ] Step 4b copy buttons fire Sonner `"Copied"`
- [ ] Step 4b countdown decrements each second
- [ ] "I have paid" → Step 5 polling → transition on terminal state
- [ ] Step 5 Paid shows `transaction_id` (mono) + allocation summary in `<TableShell>`
- [ ] Step 5 Unmatched shows the amber message
- [ ] Step 5 Expired shows "Try again" (resets to Step 1) and "Close"
- [ ] Cancel on Step 4b calls `abandonPaymentIntent` and closes
- [ ] X-close on Step 4b leaves intent `Active` (DB check); it expires at `expires_at`
- [ ] No synchronous `setState` in effect body — `react-hooks/set-state-in-effect` lint passes
- [ ] Dialog width `w-[95vw] sm:w-full sm:max-w-[600px] p-6 max-h-[90vh] overflow-y-auto`

### 19c — Provider adapters (sandbox)

- [ ] KCB token acquisition succeeds against sandbox; token cached (log cache hit)
- [ ] KCB STK Push against sandbox short code `522522` returns `ok: true` and prompt is received on a test phone
- [ ] KCB callback normalised to `Paid` for `ResultCode: "0"` → `writeSettledStkPayment` → one `Payment` row
- [ ] KCB callback duplicate (same `CheckoutRequestID` / same receipt) is a no-op
- [ ] KCB sandbox query returning HTTP 500 → adapter returns `Unknown`; intent stays `Active`; never `Failed`
- [ ] Jenga JWT acquisition succeeds
- [ ] Jenga RSA signature matches what Jenga's sandbox accepts (a successful initiate proves this)
- [ ] Jenga STK Push initiates; prompt received
- [ ] Jenga STK callback stored as informational; **no `Payment` row written**
- [ ] Jenga IPN received → `writeSettledStkPayment` → one `Payment` row
- [ ] Jenga query fallback works when IPN missed; returns `Paid` and settles
- [ ] Jenga duplicate `paymentReference` rejected by Jenga; adapter surfaces `{ ok: false }` and intent marked `Abandoned` — no orphan intent left `Active`
- [ ] **No `Payment` row created from an initiate response** — inspected in DB after initiate but before callback
- [ ] **No `Payment` row created from a client button press** — inspected after `pollPaymentIntent` returns `Active`

### 19c — Ledger writer

- [ ] `writeSettledStkPayment` with valid input creates one `Payment` with `source = 'Webhook'`, `payment_method = 'M_Pesa'`, `transaction_id = receipt`, allocations via shared `calculateAllocations`
- [ ] `writeSettledStkPayment` with duplicate receipt returns `{ skipped: 'already_recorded' }` and does not double-create
- [ ] `writeSettledStkPayment` with unknown `intentId` returns `{ skipped: 'unknown_intent' }` and does not create a `Payment` (protects against callback arriving after intent purged)
- [ ] `writeSettledStkPayment` for an intent whose status is not `Active` refuses to write (idempotency hard-stop)
- [ ] Post-commit `logAudit({ action: 'PAYMENT_RECEIVED' })` fires — check `AuditLog` table
- [ ] Grep confirms no `prisma.payment.create` anywhere in `lib/payments/providers/` — the writer is the only path

### 19c — Callback routes

- [ ] All three routes return `200` for a valid callback within ~2s (test with a slow callback payload)
- [ ] All three routes return `200` (idempotent) for a duplicate callback
- [ ] KCB route rejects a body that fails Zod
- [ ] Jenga IPN route rejects a body that fails Zod
- [ ] IP allowlist env var honoured — with empty env, warning logged; with populated env, non-matching IP returns `403`

### 19c — Wizard with STK

- [ ] Step 3 appears when at least one provider is configured; absent when `PAYMENT_PROVIDER_MODE=disabled`
- [ ] STK selection → `initiateStkPayment` called → phone receives prompt → Step 4a shown
- [ ] PIN entry on phone → callback arrives → poller picks up `Paid` → Step 5
- [ ] PIN timeout / cancellation → callback arrives with failure code → Step 5 Failed with provider reason
- [ ] `initiateStkPayment` failure (network / `ok: false`) → toast + fallback to Step 4b

### Regression & final gate

- [ ] Existing `/dashboard/local` KPIs and payment history unchanged with wizard closed
- [ ] No existing `Payment` / `UnmatchedPayment` / reconciliation flows affected
- [ ] Invariants 3, 5, 6, 8 re-checked — especially 3 (idempotency now covers `provider_receipt`) and 6 (`writeSettledStkPayment` is inside `$transaction`)
- [ ] `npx tsc --noEmit` clean
- [ ] `npm run lint` — 0 warnings, 0 errors
- [ ] `npm run build` — passes; page count **28/28** (Dialog shape). If SA1 becomes a dedicated route, expected 29/29 — pin this before starting 19b.
- [ ] Protected files untouched: `components/ui/*`, `lib/utils.ts` `twMerge` block, all committed migrations
- [ ] `context/progress-tracker.md` updated: Unit 19 phases marked complete as each ships; Architecture Decisions capture initiation-vs-truth and provider-choice rules
- [ ] `context/architecture.md` § 1, § 5, § 8 already patched — verify no residual drift

---

## Sign-offs still required before I issue the first implementation step

| # | Decision | Proposed | Override? |
|---|---|---|---|
| **SA1** | Wizard shape | Dialog, page count 28/28 | — |
| **SA2** | Paybill env vars | Three separate: `NEXT_PUBLIC_MPESA_PAYBILL_NUMBER`, `NEXT_PUBLIC_KCB_PAYBILL_NUMBER`, `NEXT_PUBLIC_EQUITY_PAYBILL_NUMBER` | — |
| **SA3** | Jenga private key | `JENGA_PRIVATE_KEY_PEM` env var, PEM format, never committed | — |
| **SA4** | Channel routing | Single provider per deployment (set by `PAYMENT_PROVIDER_MODE` + credentials); **no** per-church dual-bank routing in v1 | — |
| **SA5** | Amount ceiling | 500,000 KES | — |
| **SA6** | Wizard copy in Swahili vs English | English only for v1; localisation deferred | — |
| **SA7** | `verifyChurchPaymentAccess` policy | Finance roles any church + church-scoped roles own church only | — |
