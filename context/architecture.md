# Architecture Context

## 1. Stack
| Layer | Technology | Role |
|-------|------------|------|
| Framework | Next.js 16.4.6 (App Router) + TypeScript | Full-stack web framework |
| UI | Tailwind CSS + shadcn/ui (Base UI) | Styling and component library |
| UI Components | Recharts | Financial charts and data visualizations |
| Auth | Supabase Auth | Role-based authentication (Church, Region, National HQ, System Admin) |
| Database | Supabase (PostgreSQL) | Relational data for Churches, Payments, Scores, Reconciliation, Audit |
| ORM | Prisma v7 (via `@prisma/prisma7`) | Type-safe database queries and schema management |
| Validation | Zod | Schema validation for forms, API inputs, and webhook payloads |
| Database Connection | Supavisor (Supabase) | Connection pooling to handle high traffic |
| Integrations | KCB Bank API (Mocked for v1) | Listens for incoming payment webhooks (IPN) |
| Integrations | Equity Bank API (Planned for v2) | Dual-bank support via Jenga API |
| Integrations | Africa's Talking SMS API (Sandbox configured) | Automated SMS reminders and receipts |
| Exports | `xlsx`, `jspdf`, `jspdf-autotable` | Generates Excel and branded PDF reports |
| Background Jobs | Supabase Edge Functions / Inngest | Process webhooks, send SMS, calculate scores async |
| Utilities | `fastest-levenshtein` | Fuzzy matching for reconciliation (Unit 17) |

### Important Architectural Notes
- **Prisma Workflow:** Due to Prisma v8 breaking changes, all Prisma commands must be run via `npx prisma7 <command>`. The database URL is stored in `prisma.config.ts`, not `schema.prisma`.
- **Next.js 16 Middleware:** The `middleware.ts` convention is deprecated. Route protection is handled by `proxy.ts`.
- **Case Sensitivity:** All imports and paths are case-sensitive. Avoid renaming folders after they have been pushed to GitHub to prevent sync issues.
- **Tailwind Merge Configuration:** Because we use custom Figma typography tokens (e.g., `text-heading-1`, `p-xl`), we extended `tailwind-merge` in `lib/utils.ts`. This prevents `twMerge` from silently dropping our custom classes when they conflict with standard Tailwind colors or sizes. Do not remove this configuration.
- **Migration Workflow (Unit 15 Phase 1):** Migration history was repaired with a baseline migration (`00000000000000_baseline`) after a history gap was discovered. Rules going forward:
  - **NEVER** run `prisma db push` — it skips migration history and creates drift.
  - **ALWAYS** use `prisma7 migrate dev --name <descriptive>` for local changes.
  - **ALWAYS** commit the generated migration folder to Git.
  - Production deploys use `prisma7 migrate deploy` (never `migrate dev` on prod).
  - **NEVER** run `prisma7 migrate reset` against a database containing real data.
- **Backup Policy:** Supabase Free Plan does **not** include scheduled backups. Use `pg_dump` locally before any destructive operation. Store dumps outside the repo (`.gitignore` should exclude `*.sql`).
- **Pastorate Layer (LIVE, DORMANT):** The `Pastorate` model was added in Unit 15 Phase 1. The `Church.pastorate_id` FK is nullable and the layer is **not used** in any financial calculation or UI. It exists to support an optional `National → Region → Pastorate → Church` hierarchy if the Ministry adopts it. Do not build UI or business logic against it without an explicit spec.
- **User Bio-Data (LIVE):** The `User` model now has `first_name`, `last_name`, `phone`, `profile_photo_url`, and `bio` — all nullable. Profile UI (Phase 5) will consume these. Do not add non-null constraints or defaults without an explicit migration.
- **Church Profile Fields (LIVE):** The `Church` model now has `physical_address` (String?) and `membership_count` (Int?), both nullable. Reserved for future reporting features.
- **Bank Adapter Pattern (Future):** The system is architected to support dual-bank webhooks (KCB + Equity). Both will normalize their payloads into a standard `NormalizedTransaction` shape before hitting the Reconciliation Engine.
- **Sandbox Integration Mode:** Both KCB (Buni API) and Equity (Jenga API) integrations will utilize their respective sandbox environments. A `BANK_ADAPTER_MODE` environment variable will handle the toggle between `mock`, `sandbox`, and `live`.
- **Dynamic Fund & Channel Architecture (Future):** The current `PaymentType` and `PaymentMethod` enums will be migrated to `Fund` and `PaymentChannel` tables in V2. This enables admin-created payment categories without code changes.
- **Payment Source Backfill (Unit 17):** Production DB requires `UPDATE "Payment" SET source='Webhook' WHERE source IS NULL;` before deployment. This preserves existing payments as webhook-originated.
- **`FOUR_EYES_THRESHOLD` (Unit 17):** Defined once in `lib/constants.ts` and imported by `reconciliation-actions.ts` and `manual-entry-actions.ts`. Single source of truth — change it in one place to update every four-eyes gate project-wide. Do not reintroduce local copies.
- **Next.js Version (16.4.6):** `package.json` uses `"next": "^16.4.6"` (caret range) plus an npm-audit sweep. Verified clean via `tsc --noEmit` + `lint` + full `build` (27/27 pages). The caret range permits silent minor upgrades on `npm install` without a lockfile refresh — re-pinning to `"16.4.6"` is an open decision if strict stable-stack discipline is required.
- **Unit 17.5 — System UI Wiring & Polish (✅ COMPLETE, No Schema Impact):** Resolved layout collapse issues, centralized global formatters, fixed orphaned `UnmatchedPayment` records on rejection, and dynamically sets `Payment.source` to `'Resolved'` or `'Manual'` upon approval. No models, fields, or migrations were added.
- **Unit 18.2 — Reporting Analytics (planned):** Six read-only analytical reports (Collections Summary, Compliance, Regional Scores, YoY Comparison, Allocation Breakdown, Source/Method Breakdown) under `/dashboard/reports/[report]`. **Single-source rule:** the 40/30/20/10 Regional Incentive Score formula and the Strict Bucket Isolation compliance rule have exactly one implementation — `lib/actions/scoring-actions.ts` (with compliance rule extracted to `lib/utils/financial.ts` → `isChurchCompliant`) — and every report consumes it, never restates it. **Known limitation (documented, deferred):** the 40/30/20/10 formula currently operates over one real axis (`compliancePct`) and three placeholder constants (`timelinessPct`, `reportingAccuracy`, `leadershipEngagement` hardcoded to 85/90/95 when any compliance exists, else 0). The Regional Scores report in 18.2 displays only the real components and the resulting score/tier; the dashboard leaderboard gains a matching info tooltip. Instrumenting the three placeholder axes is scheduled as Unit 18.2.1 — tracked in `progress-tracker.md`. **Deferred decision:** score computation runs in the request-response cycle as of 18.2, matching the existing dashboard leaderboard. The computation loops all regions and their churches on every call. The trigger to migrate to a background job is **measured p95 request time > 2s** — not a fixed region count. Invariant 4 exposure is accepted, documented, and monitored.
- **Growth posture — no count assumptions (established pre-18.2):** The system currently holds ~60 regions and ~1,600+ churches, both growing. **No decision boundary in code, spec, or architecture may be anchored to those specific counts.** Performance thresholds use measured latency or measured payload size; UI counts are always derived from data, never literals. This is project-wide and not specific to reporting. Tracked in `progress-tracker.md` → `## Scale Watch`.

## 2. System Boundaries
- `app/` — Next.js routes, layouts, and page composition. Contains dashboards for Church, Region, and National HQ.
- `app/api/webhooks/kcb/` — Endpoint to receive POST requests from the Mock KCB API. Unmatched payloads are captured into `UnmatchedPayment` and returned HTTP 200.
- `app/dashboard/reconciliation/` — Five reconciliation pages (hub, unmatched, manual-entry, pending-approvals, write-offs). Server Components with `<Suspense>` + `await connection()`; RBAC gated via `verifyReconciliationAccess()`.
- `app/dashboard/audit-logs/` — National-level audit viewer with forensic snapshots.
- `components/` — Reusable UI components (tables, charts, KPI cards).
- `components/reconciliation/` — Unmatched table, resolve dialog, manual entry form, pending approvals table, write-off table, propose-write-off dialog, reject dialog, SLA badge.
- `lib/` — Server helpers, Prisma client, and API clients (KCB/SMS).
- `lib/actions/` — Server Actions grouped by domain (`reconciliation-actions.ts`, `manual-entry-actions.ts`, `writeoff-actions.ts`, `audit-actions.ts`, `dashboard-actions.ts`, `scoring-actions.ts`, `local-actions.ts`, `user-actions.ts`, `sms-actions.ts`).
- `lib/auth/` — Centralized authorization: `roles.ts` (role predicates), `guards.ts` (mutation gates: `verifyOperationsAccess`, `verifyFinanceAccess`, `verifyReconciliationAccess`, `verifyTreasurerAuthority`), `protected-users.ts` (vendor account allowlist).
- `lib/constants.ts` — Project-wide constants including `FOUR_EYES_THRESHOLD` (KES 20,000) and `PRISMA_TRANSACTION_TIMEOUT`.
- `lib/utils/export-advanced.ts` — Enterprise export engine (CSV, Excel, PDF, Print).
- `lib/utils/matching.ts` — Unit 17 Solutions Bank (Levenshtein fuzzy matching + pattern learning). Patterns short-circuit fuzzy matching when present.
- `lib/utils/financial.ts` — Cumulative ledger, `getExpectedUpToDate`, `getNetOutstanding`, `sumApprovedWriteOffs`, `isActiveChurch`, `filterActiveChurches`.
- `prisma/` — Database schema and migrations.
- `jobs/` — Background worker functions (SMS reminders, score calculations).

## 3. Storage Model
- **Supabase (PostgreSQL):** Stores core relational data: Regions, Churches, Payments, Users, Regional Scores, `PaymentAllocation`, `UnmatchedPayment`, `ResolutionPattern`, `WriteOff`, `PendingPayment`, and `AuditLog`.
- **No Blob Storage Needed:** All data is structured and relational. (Manual entry attachments via URL field only — blob upload deferred).

## 4. Auth and Access Model
*Strict Hierarchical Access: National HQ → Region → Church*
*(Enforced via Supabase Row Level Security - RLS at the database level, plus server-action guards in `lib/auth/guards.ts`)*

### Role-Based Access Control (RBAC) Matrix
| Role(s) | Sidebar Tabs | Core Focus |
| :--- | :--- | :--- |
| **SYSTEM_ADMIN** (Vendor/Owner) | All tabs | Full access + Protected User Management. Cannot be edited/deleted by anyone else via UI. Hidden from Users list unless viewer is also SYSTEM_ADMIN. |
| **FINANCE_ADMIN** | Dashboard, Payments, Reconciliation, Mock KCB, Reports, Settings, Audit Logs | Full financial oversight, reconciliation, write-off proposals. Cannot manage Users/Registry. |
| **OPERATIONS_ADMIN** | Dashboard, Regions, Churches, Users, Reports, Settings, Audit Logs | Registry and User management. Cannot access Payments, Mock KCB, or Reconciliation. |
| **NATIONAL_TREASURER** | Dashboard, Regions, Churches, Payments, Users, Reconciliation, Mock KCB, Reports, Settings, Audit Logs | Ultimate financial authority. Can approve write-offs and high-value four-eyes resolutions. |
| **NATIONAL_OVERSEER** | Dashboard, Regions, Churches, Payments, Users, Reconciliation, Reports, Settings, Audit Logs | Read-heavy oversight role. Same visibility as Treasurer but limited mutation capabilities. |
| **REGIONAL_CHAIRMAN / REGIONAL_TREASURER** | Regional Dashboard, Regional Payments, Reports, Settings | Regional compliance monitoring, drill-downs, and bulk SMS. |
| **LOCAL_PASTOR / CHURCH_TREASURER** | Local Dashboard, Reports, Settings | Personal church compliance, exact bucket status, and payment history. |

### Protected Accounts (SYSTEM_ADMIN)
- SYSTEM_ADMIN users are stored in the `User` table but flagged as protected via a hardcoded allowlist (see `lib/auth/protected-users.ts`).
- **No user, regardless of role, can:** Delete, change role, or deactivate a SYSTEM_ADMIN account via the UI.
- Protected accounts are excluded from `/dashboard/users` list by default (visible only to other SYSTEM_ADMIN users).
- Any attempt to manage a protected account returns a 403 in the server action.
- Manual intervention is only possible via direct Supabase dashboard access.

### Separation of Duties (FINANCE_ADMIN vs OPERATIONS_ADMIN)
- `FINANCE_ADMIN` controls money; `OPERATIONS_ADMIN` controls registry and users. Neither can perform the other's function.
- Enforced at the server-action boundary by `verifyFinanceAccess()` and `verifyOperationsAccess()`, not merely by hiding UI elements.
- `SYSTEM_ADMIN` may perform both. `NATIONAL_TREASURER` has the finance authority plus approval rights.

### Four-Eyes Principle (Reconciliation)
- The proposer of a financial item can never approve it. Enforced in `approvePendingPayment`, `rejectPendingPayment`, `approveWriteOff`, and `rejectWriteOff` via `if (proposed_by === actorId)`.
- `FOUR_EYES_THRESHOLD = 20000` (from `lib/constants.ts`) governs when Treasurer approval is required. Write-offs always require Treasurer approval regardless of amount. Any item touching 90+ day arrears also requires Treasurer approval.

### Communication Identity (SMS)
- **Universal Capability, Contextual Identity:** All authorized roles (National, Regional) can send SMS reminders. However, the SMS message body must reflect the sender's role.
- **Implementation:** The `sendBulkReminders(recipients, senderRole)` function accepts exactly two arguments — `recipients` and `senderRole: 'NATIONAL' | 'REGIONAL'`.

## 5. Invariants (Rules the code must NEVER violate)
1. **Webhook Security:** Every incoming payment webhook from KCB must be verified using a secure secret/signature before processing.
2. **Data Isolation (RLS):** A Regional Chairman must *never* be able to query or view data belonging to a church outside their assigned region. Enforced at the database level via RLS policies.
3. **Idempotency:** If a KCB payment webhook is received twice, the system must not double-count the payment. Idempotency checks BOTH `Payment.transaction_id` AND `UnmatchedPayment.bank_reference`.
4. **Async Processing:** Sending SMS messages and calculating heavy regional scores must *never* run in the main request-response cycle.
5. **Reconciliation Mapping:** Every KCB payment must contain a `BillRefNumber` (Church ID). If the ID does not match an active church, the payment goes to the `UnmatchedPayment` table for HQ manual review, never discarded. The webhook returns HTTP 200 so the bank stops retrying.
6. **Atomic Financial Mutations:** Any operation that modifies payment records, church totals, or regional scores must use database transactions (`prisma.$transaction`). If one step fails, all steps roll back.
7. **Arrears Aging & Schedule Adherence:** Arrears must be calculated based on the age of the debt (0-30, 31-60, 61-90, 90+ days). The Hero Card progress bar must measure against *Expected-to-Date*, not the absolute Year-End target.
8. **Four-Eyes & Write-Offs:** Resolutions ≥ KES 20,000 and all write-offs require National Treasurer approval. Write-offs are absolute (no threshold). Defunct churches are excluded from compliance percentages and regional scores. The proposer of an item may never approve it — enforced server-side.

*Invariant 4 note (Unit 18.2):* Score computation is synchronous in the request cycle. It matches the existing dashboard leaderboard and is accepted for 18.2. The region and church counts are growing; the boundary for migrating to a background job is **measured p95 request time > 2s**, not a fixed count. Tracked in `progress-tracker.md` → Scale Watch. The exposure is documented and monitored, not newly introduced in 18.2.

## 6. Financial Flow Model
- **Centralized Bank Account:** There is only ONE KCB Bank Account. The database does NOT store individual church bank accounts.
- **Stream Allocation:** Every payment received is treated as a "stream" that must be allocated to a `Church` record via the `church_code` (`BillRefNumber`).
- **Unallocated Funds:** Any funds received that do not match a valid `church_code` remain in the `UnmatchedPayment` pool at the National HQ level until manually reconciled by an admin.
- **Arrears Aging:** The system must bucket unpaid balances by days overdue to prioritize collection efforts.
- **Strict Bucket Isolation:** KPIs must display Annual and Monthly buckets as independent entities. A combined "Total Collected" KPI hides which bucket is failing.

## 7. Financial Ledger & Strict Bucket Isolation
- **Cumulative Ledger:** The system calculates expected amounts cumulatively from a church's `created_at` date. Year-end arrears do not vanish on Jan 1st.
- **Strict Bucket Isolation:** Annual contributions (KES 5,000) and Monthly contributions (KES 500) are treated as completely separate ledgers. An overpayment in one bucket does not cover a shortfall in the other.
- **Dynamic Statuses:** A church's status is evaluated per bucket (`annualStatus` vs `monthlyStatus`). The UI dynamically swaps the badge and KPI counts based on the active `periodView`.
- **Carry-Forward & Prepayments:** Handled implicitly via the cumulative math. The UI explicitly surfaces `annualCredit` and `monthlyCredit`.
- **Allocation Engine:** Payment records remain immutable 1:1 bank ledger entries. Annual/Monthly attribution is handled purely via the `PaymentAllocation` table.
- **Write-Off Accounting (Unit 17):** Obligation is never reduced from `getExpectedUpToDate()`. Write-offs are subtracted from `outstanding` via `sumApprovedWriteOffs()`. Aging buckets reduced LIFO (oldest debt written off first). Matches IFRS 9 / IPSAS 29.
- **Fund Accounting (Future):** All payments are currently split into `Annual` and `Monthly` buckets. In V2, the system will support arbitrary **Funds**.

## 8. Schema Additions

### AuditLog (Unit 16.3) — ✅ COMPLETE

Migration: `20261115211407_add_audit_log_system`.

**Purpose:** System-wide forensic audit trail for every critical mutation. Append-only — no updates, no deletes, even by SYSTEM_ADMIN.

**Fields:** `id`, `actor_id`, `actor_email`, `actor_role`, `action`, `entity`, `entity_id`, `before_data` (Json?), `after_data` (Json?), `metadata` (Json?), `created_at`.
**Indexes:** `created_at`, `actor_id`, `entity`, `action`.

**Helper:** `lib/actions/audit-actions.ts` → `logAudit(payload)`.
- **CRITICAL INVARIANT:** `logAudit()` must **NEVER throw**. An audit failure must not roll back the main mutation.
- **CRITICAL RULE:** Call `logAudit()` **AFTER** the main Prisma transaction succeeds — never inside it.

**Wired mutations:** User (6 events), Church (3 events), Region (2 events), KCB webhook (`PAYMENT_RECEIVED` with allocations), and all Unit 17 reconciliation events (`UNMATCHED_CAPTURED`, `UNMATCHED_RESOLVED`, `PENDING_PAYMENT_APPROVED`, `WRITEOFF_PROPOSED`, etc.).

### Reconciliation Models (Unit 17) — ✅ IMPLEMENTED (Merged PR #44)

Migrations: `20261116034805_add_reconciliation_and_writeoffs` + `add_cheque_payment_method`.

**`UnmatchedPayment`** — Forensic capture of webhook payments that failed matching.
- Fields: `id, bank_reference (unique), bank_name, raw_bill_ref, amount, payer_phone, raw_payload (Json), status ('Pending'|'Resolved'|'Rejected'|'WrittenOff'), suggested_church_id, confidence_score, assigned_church_id, assigned_payment_id, reviewed_by, reviewed_at, notes, escalated_at, created_at`
- Idempotency: `bank_reference` is unique.

**`ResolutionPattern`** (Solutions Bank) — Learned patterns from every successful resolution.
- Fields: `id, raw_reference_pattern, normalized_reference, resolved_church_code, resolution_type ('Fuzzy'|'Manual'|'Rule'), hit_count, confidence_score, is_active, created_by, last_used_at, created_at`
- Unique constraint: `@@unique([raw_reference_pattern, resolved_church_code])` (Prisma auto-name: `raw_reference_pattern_resolved_church_code`)
- Confidence formula: `min(100, 50 + hit_count * 10)`
- Precedence: patterns short-circuit `suggestMatches()` before any Levenshtein scoring runs.

**`WriteOff`** — Formal bad-debt write-offs per IFRS 9 / IPSAS 29.
- Fields: `id, church_id, amount, reason ('DEFUNCT'|'DISSOLVED'|'UNCOLLECTABLE_90D'|'COURT_ORDER'|'OTHER'), notes, status ('Pending'|'Approved'|'Rejected'), proposed_by, proposed_at, approved_by, approved_at, rejection_reason, resulting_defunct_flag, audit_log_id`
- Approval: **always** requires Treasurer (no threshold exception).

**`PendingPayment`** — Staging for high-value manual entries (Four-Eyes flow).
- Fields: `id, proposed_by, proposed_at, church_id, amount, payment_method, transaction_id, payment_date, allocations_json (Json), attachment_url, notes, status ('Pending'|'Approved'|'Rejected'), reviewed_by, reviewed_at, rejection_reason, resulting_payment_id`
- The immutable bank ledger never sees a `Pending` state.

**Field Additions:**
- `Church.is_defunct (Boolean, default false)` — set true when full outstanding is written off. Excluded from compliance %, regional scores, SMS lists, church dropdowns.
- `Payment.source (String, default 'Webhook')` — 'Webhook' | 'Manual' | 'Resolved'.
- `PaymentMethod` enum now includes `Cheque`.

### PaymentIntent (Unit 19 — Planned)

For the guided payment wizard to track in-progress payments and match them to incoming webhooks within a time window. Fields: `id`, `church_id`, `amount`, `payment_type`, `phone`, `status`, `matched_payment_id`, `created_by`, `expires_at`, `created_at`.

### Unit 17.5 — System UI Wiring & Polish — ✅ COMPLETE (No Schema)

- **Formatters:** Centralized `formatCurrency`, `formatDate`, and `formatDateTime` into `lib/utils.ts` with explicit `Africa/Nairobi` timezone support.
- **Layouts & Logic:** Added `is_defunct` guard to `getSuggestedAllocations`. Removed the duplicate `?tab=pending` hub card.
- **Orphaned Unmatched Payments Fixed:** `rejectPendingPayment` now resets the linked `UnmatchedPayment` back to `Pending`. `approvePendingPayment` marks it as `Resolved` and links the new `Payment`.
- **Source Tagging Fixed:** `approvePendingPayment` sets `Payment.source` to `'Resolved'` if it originated from an unmatched queue, or `'Manual'` otherwise.
- No models, fields, or migrations were added.

### LoginHistory (Unit 16.4 — Optional, Not Yet Scheduled)

Track login attempts for security monitoring. Fields: `id`, `user_id`, `ip_address`, `user_agent`, `success`, `created_at`.