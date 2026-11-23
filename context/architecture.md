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
| Integrations | KCB Buni STK Push (Sandbox) | STK Push initiation for KCB-issued paybills (Unit 19c) |
| Integrations | Equity Jenga STK Push (Sandbox) | STK Push initiation + IPN confirmation for Equity-issued paybills (Unit 19c) |
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
- **Pastorate Layer (LIVE, DORMANT):** The `Pastorate` model was added in Unit 15 Phase 1. The `Church.pastorate_id` FK is nullable and the layer is **not used** in any financial calculation or UI. It exists to support an optional `National → Region → Pastorate → Church` hierarchy if the Ministry adopts it. Do not build UI or business logic against it without an explicit spec.- **User Bio-Data (LIVE):** The `User` model now has `first_name`, `last_name`, `phone`, `profile_photo_url`, and `bio` — all nullable. Profile UI (Phase 5) will consume these. Do not add non-null constraints or defaults without an explicit migration.
- **Church Profile Fields (LIVE):** The `Church` model now has `physical_address` (String?) and `membership_count` (Int?), both nullable. Reserved for future reporting features.
- **Bank Adapter Pattern (Future):** The system is architected to support dual-bank webhooks (KCB + Equity). Both will normalize their payloads into a standard `NormalizedTransaction` shape before hitting the Reconciliation Engine.- **Sandbox Integration Mode:** Both KCB (Buni API) and Equity (Jenga API) integrations will utilize their respective sandbox environments. A `BANK_ADAPTER_MODE` environment variable will handle the toggle between `mock`, `sandbox`, and `live`.
- **Dynamic Fund & Channel Architecture (Future):** The current `PaymentType` and `PaymentMethod` enums will be migrated to `Fund` and `PaymentChannel` tables in V2. This enables admin-created payment categories without code changes.
- **Payment Source Backfill (Unit 17):** Production DB requires `UPDATE "Payment" SET source='Webhook' WHERE source IS NULL;` before deployment. This preserves existing payments as webhook-originated.
- **`FOUR_EYES_THRESHOLD` (Unit 17):** Defined once in `lib/constants.ts` and imported by `reconciliation-actions.ts` and `manual-entry-actions.ts`. Single source of truth — change it in one place to update every four-eyes gate project-wide. Do not reintroduce local copies.
- **Next.js Version (16.4.6):** `package.json` uses `"next": "^16.4.6"` (caret range) plus an npm-audit sweep. Verified clean via `tsc --noEmit` + `lint` + full `build` (27/27 pages). The caret range permits silent minor upgrades on `npm install` without a lockfile refresh — re-pinning to `"16.4.6"` is an open decision if strict stable-stack discipline is required.
- **Unit 17.5 — System UI Wiring & Polish (✅ COMPLETE, No Schema Impact):** Resolved layout collapse issues, centralized global formatters, fixed orphaned `UnmatchedPayment` records on rejection, and dynamically sets `Payment.source` to `'Resolved'` or `'Manual'` upon approval. No models, fields, or migrations were added.
- **Unit 18.2 — Reporting Analytics (✅ COMPLETE, Merged PR #52):** Six read-only analytical reports (Collections Summary, Compliance, Regional Scores, YoY Comparison, Allocation Breakdown, Source/Method Breakdown) under `/dashboard/reports/[report]`. **Single-source rule:** the 40/30/20/10 Regional Incentive Score formula and the Strict Bucket Isolation compliance rule have exactly one implementation — `lib/actions/scoring-actions.ts` (with compliance rule extracted to `lib/utils/financial.ts` → `isChurchCompliant`) — and every report consumes it, never restates it. **Known limitation (documented, deferred):** the 40/30/20/10 formula currently operates over one real axis (`compliancePct`) and three placeholder constants (`timelinessPct`, `reportingAccuracy`, `leadershipEngagement` hardcoded to 85/90/95 when any compliance exists, else 0). The Regional Scores report in 18.2 displays only the real components and the resulting score/tier; the dashboard leaderboard gains a matching info tooltip. Instrumenting the three placeholder axes is scheduled as Unit 18.2.1 — tracked in `progress-tracker.md`. **Deferred decision:** score computation runs in the request-response cycle as of 18.2, matching the existing dashboard leaderboard. The computation loops all regions and their churches on every call. The trigger to migrate to a background job is **measured p95 request time > 2s** — not a fixed region count. Invariant 4 exposure is accepted, documented, and monitored. **Shipped in 18.2:** `lib/utils/report-registry.ts` (single source of truth for 11 reports, three consumers), `toReportRole` in `lib/auth/roles.ts`, `buildPaymentWhere(dbUser, regionId?)` region narrowing, `scopeByRole` in `lib/utils/report-scope.ts`, `RegionalScoreData` extended with `grossOutstandingAnnual` / `grossOutstandingMonthly` / `totalWrittenOff`, dashboard leaderboard tooltip added. Gate 28/28, page count unchanged.
- **Growth posture — no count assumptions (established pre-18.2):** The system currently holds ~60 regions and ~1,600+ churches, both growing. **No decision boundary in code, spec, or architecture may be anchored to those specific counts.** Performance thresholds use measured latency or measured payload size; UI counts are always derived from data, never literals. This is project-wide and not specific to reporting. Tracked in `progress-tracker.md` → `## Scale Watch`.
- **In-App Help System (Unit 20):** The Guided Tour is fully first-party (no `react-joyride`) using `localStorage` for completion state (`mfa-help-tour-seen-[TIER]`). The Help drawer uses explicit inline styles (`width`, `height`, `backgroundColor`) to bypass a base UI `Sheet` flexbox collapse bug without modifying the protected primitive. `InfoTooltip` uses a wrapper `<span>` with a bubble guard to prevent parent `<Link>` navigation.

## 2. System Boundaries
- `app/` — Next.js routes, layouts, and page composition. Contains dashboards for Church, Region, and National HQ.
- `app/api/webhooks/kcb/` — Endpoint to receive POST requests from the Mock KCB API. Unmatched payloads are captured into `UnmatchedPayment` and returned HTTP 200.
- `app/dashboard/reconciliation/` — Five reconciliation pages (hub, unmatched, manual-entry, pending-approvals, write-offs). Server Components with `<Suspense>` + `await connection()`; RBAC gated via `verifyReconciliationAccess()`.
- `app/dashboard/reports/` — Reporting hub (`/dashboard/reports`) plus a single dynamic sub-route (`/dashboard/reports/[report]`) that resolves 11 report slugs via the registry (Unit 18.1 + 18.2).
- `app/dashboard/audit-logs/` — National-level audit viewer with forensic snapshots.
- `app/dashboard/church-deletion-requests/` — National approval queue for Regional church deletion requests (Unit 20.6b). Server Component; RBAC gated via `verifyOperationsAccess()`; renders `<ChurchDeletionRequestsTable>` with Approve/Reject dialogs. Deliberately **no** `<TableToolbar>`, no checkbox column, no export — this is an **action queue**, not a report (deviation justified at § 8 ChurchDeletionRequest).
- `components/` — Reusable UI components (tables, charts, KPI cards).
- `components/reconciliation/` — Unmatched table, resolve dialog, manual entry form, pending approvals table, write-off table, propose-write-off dialog, reject dialog, SLA badge.
- `components/reports/` — Report shell, registry-driven selector, 18.1 core report tables (arrears, cashbook, write-off register, defunct register, inactive churches).
- `components/reports/analytics/` — Six 18.2 analytics tables (collections-summary, compliance, regional-scores, yoy-comparison view + chart, allocation-breakdown, source-method).
- `components/churches/` — Church registry table + profile client; **Unit 20.6b:** `church-deletion-requests-table.tsx`, `approve-church-deletion-dialog.tsx`, `reject-church-deletion-dialog.tsx`, `request-church-deletion-dialog.tsx`.
- `components/regional/` — Regional dashboard shell, KPI cards, church table, propose-write-off dialog wiring, **Unit 20.6b** `my-deletion-requests-table.tsx`.
- `lib/` — Server helpers, Prisma client, and API clients (KCB/SMS).
- `lib/actions/` — Server Actions grouped by domain (`reconciliation-actions.ts`, `manual-entry-actions.ts`, `writeoff-actions.ts`, `audit-actions.ts`, `dashboard-actions.ts`, `scoring-actions.ts`, `local-actions.ts`, `user-actions.ts`, `sms-actions.ts`, `report-actions.ts`, `church-deletion-request-actions.ts`).
- `lib/auth/` — Centralized authorization: `roles.ts` (role predicates + `toReportRole`), `guards.ts` (gates: `verifyOperationsAccess`, `verifyFinanceAccess`, `verifyReconciliationAccess`, `verifyTreasurerAuthority`, `verifyReportsAccess`, `verifyChurchDeletionRequestAccess`), `protected-users.ts` (vendor account allowlist).
- `lib/constants.ts` — Project-wide constants including `FOUR_EYES_THRESHOLD` (KES 20,000), `PRISMA_TRANSACTION_TIMEOUT`, and `CHURCH_DELETION_SLA_YELLOW_DAYS` / `CHURCH_DELETION_SLA_RED_DAYS` (Unit 20.6b — 3 / 7).
- `lib/church/` — Shared church helpers. `soft-delete-tx.ts` (Unit 20.6b) — `softDeleteChurchTx` soft-delete helper, single source of truth used by both the direct `deleteChurch` path (Phase A) and `approveChurchDeletionRequest` (Phase B). See § 8 Church Soft Delete for the deviation-from-spec rationale.
- `lib/utils/export-advanced.ts` — Enterprise export engine (CSV, Excel, PDF, Print).
- `lib/utils/matching.ts` — Unit 17 Solutions Bank (Levenshtein fuzzy matching + pattern learning). Patterns short-circuit fuzzy matching when present.
- `lib/utils/financial.ts` — Cumulative ledger, `getExpectedUpToDate`, `getPeriodStatus`, `getCreditBalance`, `getNetOutstanding`, `sumApprovedWriteOffs`, `isActiveChurch` (defunct-only), `isNotDeleted` (Unit 20.6a — soft-delete-only; deliberately distinct from `isActiveChurch`), `filterActiveChurches`, `isChurchCompliant` (Unit 18.2 — single source of the Strict Bucket Isolation compliance rule).
- `lib/utils/report-scope.ts` — Strict role-based Prisma where clauses (`buildChurchWhere`, `buildPaymentWhere` with optional `regionId`) and `scopeByRole` for rank-preserving post-sort filtering (Unit 18.1 + 18.2).
- `lib/utils/report-registry.ts` — Single source of truth for report slug/title/description/group/role visibility; three consumers (hub, `[report]` resolver, `<ReportSelector>`) (Unit 18.2).
- `prisma/` — Database schema and migrations.
- `jobs/` — Background worker functions (SMS reminders, score calculations).
- `components/help/` — Guided tour (`guided-tour.tsx`), Help drawer (`help-drawer.tsx`), contextual wrapper (`info-tooltip.tsx`), and layout provider (`help-drawer-provider.tsx`).
- `lib/help/` — Single source of truth for help copy (`content.ts`), tour step definitions (`tour-steps.ts`), and UI config (`constants.ts`).
- `app/dashboard/help/` — Full Help reference page.

## 3. Storage Model
- **Supabase (PostgreSQL):** Stores core relational data: Regions, Churches, Payments, Users, Regional Scores, `PaymentAllocation`, `UnmatchedPayment`, `ResolutionPattern`, `WriteOff`, `PendingPayment`, `ChurchDeletionRequest`, and `AuditLog`.
- **No Blob Storage Needed:** All data is structured and relational. (Manual entry attachments via URL field only — blob upload deferred).

## 4. Auth and Access Model
*Strict Hierarchical Access: National HQ → Region → Church*
*(Enforced via Supabase Row Level Security - RLS at the database level, plus server-action guards in `lib/auth/guards.ts`)*

### Role-Based Access Control (RBAC) Matrix
| Role(s) | Sidebar Tabs | Core Focus |
| :--- | :--- | :--- |
| **SYSTEM_ADMIN** (Vendor/Owner) | All tabs | Full access + Protected User Management. Cannot be edited/deleted by anyone else via UI. Hidden from Users list unless viewer is also SYSTEM_ADMIN. |
| **FINANCE_ADMIN** | Dashboard, Payments, Reconciliation, Mock KCB, Reports, Settings, Audit Logs | Full financial oversight, reconciliation, write-off proposals. Cannot manage Users/Registry. |
| **OPERATIONS_ADMIN** | Dashboard, Regions, Churches, Deletion Requests, Users, Reports, Settings, Audit Logs | Registry and User management. Approves/rejects Regional church deletion requests. Cannot access Payments, Mock KCB, or Reconciliation. |
| **NATIONAL_TREASURER** | Dashboard, Regions, Churches, Deletion Requests, Payments, Users, Reconciliation, Mock KCB, Reports, Settings, Audit Logs | Ultimate financial authority. Can approve write-offs and high-value four-eyes resolutions. Also approves/rejects Regional church deletion requests (Operations-domain authority covers church mutation). |
| **NATIONAL_OVERSEER** | Dashboard, Regions, Churches, Payments, Users, Reconciliation, Reports, Settings, Audit Logs | Read-heavy oversight role. Same visibility as Treasurer but limited mutation capabilities. |
| **REGIONAL_CHAIRMAN / REGIONAL_TREASURER** | Regional Dashboard, Regional Payments, Reports, Settings | Regional compliance monitoring, drill-downs, and bulk SMS. May propose (and cancel) church deletion requests for churches in their **own region** — Regional dashboard's "My Deletion Requests" tab. |
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
- **Registry deletion requests (Unit 20.6b) follow registry authority, not finance authority.** A church deletion request is a **registry** operation — it removes the church from active operational views, not from financial history. The workflow is proposed by a Regional role (Chairman or Treasurer, region-scoped) and reviewed by a National Operations-domain role (`OPERATIONS_ADMIN`, `SYSTEM_ADMIN`, `NATIONAL_TREASURER`) via `verifyOperationsAccess()`. This is deliberately distinct from **financial** write-off authority, which requires Treasurer approval under Invariant 8. A church can be financially written off (defunct) without being deleted, and vice versa — see § 8 Church Soft Delete: "Defunct ≠ deleted".

### Four-Eyes Principle (Reconciliation)
- The proposer of a financial item can never approve it. Enforced in `approvePendingPayment`, `rejectPendingPayment`, `approveWriteOff`, and `rejectWriteOff` via `if (proposed_by === actorId)`.
- `FOUR_EYES_THRESHOLD = 20000` (from `lib/constants.ts`) governs when Treasurer approval is required. Write-offs always require Treasurer approval regardless of amount. Any item touching 90+ day arrears also requires Treasurer approval.
- **Unit 20.6b extension:** the "proposer ≠ approver" rule applies to `approveChurchDeletionRequest` and `rejectChurchDeletionRequest` — a Regional Chairman or Treasurer who proposed a deletion request cannot approve or reject it. Enforced via `if (proposed_by === actorId)`. Unreachable by role in practice (proposer is Regional; approver is National) but present as a hard backstop, matching the write-off pattern. **The KES 20,000 threshold does not gate deletion requests** — the four-eyes threshold is a financial concept, and deletion is a registry action. Only the "proposer ≠ approver" invariant applies here.

### Communication Identity (SMS)
- **Universal Capability, Contextual Identity:** All authorized roles (National, Regional) can send SMS reminders. However, the SMS message body must reflect the sender's role.
- **Implementation:** The `sendBulkReminders(recipients, senderRole)` function accepts exactly two arguments — `recipients` and `senderRole: 'NATIONAL' | 'REGIONAL'`.

## 5. Invariants (Rules the code must NEVER violate)
1. **Webhook Security:** Every incoming payment webhook from KCB must be verified using a secure secret/signature before processing.
2. **Data Isolation (RLS):** A Regional Chairman must *never* be able to query or view data belonging to a church outside their assigned region. Enforced at the database level via RLS policies.
3. **Idempotency:** If a payment is received twice — via any channel (webhook, STK callback, STK Query, or manual reconciliation) — the system must not double-count it. Idempotency checks `Payment.transaction_id`, `UnmatchedPayment.bank_reference`, `PaymentIntent.provider_request_id`, **and** `PaymentIntent.provider_receipt`. A payment that settles via STK Push and is also confirmed by a bank C2B webhook must produce exactly one `Payment` row. Duplicate bank callbacks are a no-op enforced by database unique constraints, never by an application check-then-insert.
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
- **Cumulative Ledger:** The system calculates expected amounts cumulatively from a church's `created_at` date. Year-end arrears do not vanish on Jan 1st.- **Strict Bucket Isolation:** Annual contributions (KES 5,000) and Monthly contributions (KES 500) are treated as completely separate ledgers. An overpayment in one bucket does not cover a shortfall in the other.
- **Dynamic Statuses:** A church's status is evaluated per bucket (`annualStatus` vs `monthlyStatus`). The UI dynamically swaps the badge and KPI counts based on the active `periodView`.
- **Carry-Forward & Prepayments:** Handled implicitly via the cumulative math. The UI explicitly surfaces `annualCredit` and `monthlyCredit`.
- **Allocation Engine:** Payment records remain immutable 1:1 bank ledger entries. Annual/Monthly attribution is handled purely via the `PaymentAllocation` table.
- **Write-Off Accounting (Unit 17):** Obligation is never reduced from `getExpectedUpToDate()`. Write-offs are subtracted from `outstanding` via `sumApprovedWriteOffs()`. Aging buckets reduced FIFO (oldest debt written off first). Matches IFRS 9 / IPSAS 29.
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

### Payment.payment_date Index (Unit 18.2-pre) — ✅ COMPLETE (Merged PR #51)

Migration: `20261118133648_add_payment_date_index` — single `CREATE INDEX "Payment_payment_date_idx" ON "Payment"("payment_date")`. Reporting queries filter by `payment_date` continuously; without the index, each is a sequential scan on an unbounded table. Applied locally; production deploys via `prisma7 migrate deploy`. No other schema change. At current row count PostgreSQL correctly prefers a Seq Scan; the index is selected as the table grows.

### PaymentIntent (Unit 19 — Planned, Sandbox for 19c)

For the guided payment wizard to track in-progress payments and match them to incoming bank confirmations within a time window. Tracks which **initiation channel** was used so the verification action knows where to query.

**Fields:**
- `id`, `church_id`, `amount`, `payment_type` (`Annual` | `Monthly`), `created_by`, `expires_at`, `created_at`
- `channel` — `'Manual' | 'KCB_Buni' | 'Equity_Jenga'` (which initiation path produced this intent)
- `provider_request_id` — provider-issued request ID (`MerchantRequestID` for KCB, `orderReference` for Jenga). `null` for `Manual`.
- `provider_receipt` — M-Pesa receipt code once confirmed (`MpesaReceiptNumber`). `null` until settled; unique when non-null.
- `provider_result_code` — last known result code from the provider (`"0"`, `"1032"`, `"5"`, etc.).
- `raw_callback` — forensic JSON of the last callback received from the provider. `null` for `Manual`.
- `status` — `'Active' | 'Matched' | 'Unmatched' | 'Expired' | 'Abandoned'`- `matched_payment_id`, `matched_unmatched_id`, `matched_at`, `abandoned_at` (audit trail)
- `raw_bill_ref_entered` — what the user was instructed to type (typo detection for the `Manual` channel)

**Indexes:** `@@index([church_id, status])`, `@@index([expires_at])`, `@@index([channel, status])`, `@@index([provider_request_id])`, `@@unique([provider_receipt])` (sparse — many null, one non-null per receipt), `@@unique([matched_payment_id])`, `@@unique([matched_unmatched_id])`.

**Truth path per channel:**
| Channel | Truth source for `Payment` write |
|---|---|
| `Manual` | Existing C2B webhook (`Payment.transaction_id` = `TransID`) |
| `KCB_Buni` | KCB STK callback (sandbox query is unreliable; callback-first in UAT). Unknown status → `Pending`, never `Failed`. |
| `Equity_Jenga` | Jenga **IPN** (complete callback), **not** the STK callback. Jenga itself recommends this. Jenga query endpoint is usable as fallback. |

**Never** write a `Payment` from: an STK Push initiation response, a client "I have paid" button, or a status query that returns anything other than `Paid`.

### Unit 17.5 — System UI Wiring & Polish — ✅ COMPLETE (No Schema)

- **Formatters:** Centralized `formatCurrency`, `formatDate`, and `formatDateTime` into `lib/utils.ts` with explicit `Africa/Nairobi` timezone support.
- **Layouts & Logic:** Added `is_defunct` guard to `getSuggestedAllocations`. Removed the duplicate `?tab=pending` hub card.
- **Orphaned Unmatched Payments Fixed:** `rejectPendingPayment` now resets the linked `UnmatchedPayment` back to `Pending`. `approvePendingPayment` marks it as `Resolved` and links the new `Payment`.
- - **Source Tagging Fixed:** `approvePendingPayment` sets `Payment.source` to `'Resolved'` if it originated from an unmatched queue, or `'Manual'` otherwise.
- No models, fields, or migrations were added.

### Church Soft Delete (Unit 20.6a) — ✅ COMPLETE

Migration: `20261121145153_add_church_soft_delete` — single `ALTER TABLE "Church" ADD COLUMN "deleted_at" TIMESTAMP(3);`. Purely additive, no backfill needed (`deleted_at` is nullable, defaults `NULL`).

**Field:** `Church.deleted_at DateTime?` — null means active. Set by `softDeleteChurchTx` (below).

**Why soft delete is the only viable path.** `Payment.church_id`, `WriteOff.church_id`, `PendingPayment.church_id`, and `PaymentIntent.church_id` are all **required** FKs with Prisma's default `Restrict` on PostgreSQL. A hard `prisma.church.delete` on any realistic church fails at the FK boundary — exactly the case the pre-20.6 `deleteChurch` catch clause named ("They may have linked payments"). Cascading deletes would violate Invariant 5 (reconciliation preservation) and destroy audit-log traceability. So the pre-20.6 `deleteChurch` was effectively dead code for 90% of churches, and 20.6 replaces it with soft delete + user deactivation, atomically, inside `prisma.$transaction`.

**What soft-deleting a church does:**
1. Sets `Church.deleted_at = now()`.
2. Sets `is_active = false` on every attached `User` (`church_id` matches, `is_active = true`).
3. Does **not** delete `Payment`, `WriteOff`, `PendingPayment`, `PaymentIntent`, `UnmatchedPayment`, `User`, or `AuditLog` rows — all FKs remain intact, all history traceable.

**"Defunct ≠ deleted":** `Church.is_defunct` (Unit 17) marks a church whose full outstanding has been written off — such churches **remain in financial reports** (gross arrears, write-off register, defunct register) because their write-offs are financial disclosure events. `Church.deleted_at` (Unit 20.6a) removes a church from **active operational views** — the church no longer exists as an operating entity, but its financial trail stays queryable via the audit log and (for the two disclosure registers) via targeted queries that strip `deleted_at` from the filter. Do **not** merge these states into one predicate. `isActiveChurch` (defunct-only) and `isNotDeleted` (deleted-only) are deliberately distinct.

**Where soft-deleted churches are excluded — via `buildChurchWhere` (single filter, all reports inherit):**
- Church registry (`getChurches`), church stats (`getChurchStats`)
- Region dashboard (`regional-actions.ts` — nested `churches` relation)
- National dashboard (`dashboard-actions.ts` — the `churches` aggregate; `recentTransactions` deliberately excluded, see below)
- Scoring engine (`scoring-actions.ts` — nested `churches` relation)
- Reports that route through `buildChurchWhere`: Arrears, Compliance, Arrears Aging, Prepayment / Credit Position, Inactive Churches
- Every church dropdown (resolve unmatched, manual entry, propose write-off, payment intent wizard) — all entry points reject a deleted church with an explicit error, and their pickers exclude via `deleted_at: null` on the query
- SMS recipient sets — recipients are built by callers from already-filtered sources (`getChurches`, `getArrearsReport`, `regional-actions.ts`); `sms-actions.ts` itself is transport-only
- Church detail page (`/dashboard/churches/[code]`) — `notFound()` guard
- Local dashboard (`getLocalChurchStats`) — returns `{ error: 'This church has been deleted.' }`

**Where soft-deleted churches are deliberately preserved (financial disclosure):**

| Surface | Why preserve | Mechanism |
|---|---|---|
| **Write-Off Register** (`getWriteOffRegister`) | IFRS 9 / IPSAS 29: a write-off is a recognized financial loss. Deleting the church does not un-recognize it. Auditors must be able to trace every write-off. | Strip `deleted_at` from `churchWhere` via destructure; add `church_deleted: boolean` per row |
| **Defunct Register** (`getDefunctChurchRegister`) | Same as above — carries write-off amounts, is a disclosure register | Same pattern |
| **Cashbook, Collections Summary, YoY, Allocation Breakdown, Source/Method, Intake Volume, Unmatched Backlog, SLA Aging** | The money moved. `Payment.transaction_id` is an immutable ledger entry; the church's existence state does not change whether the payment happened. | `buildPaymentWhere` is **not** filtered by church deletion state (A0 decision) |
| **Live Feed (`recentTransactions` on National Dashboard)** | Money-ledger view; same principle as Cashbook | Not filtered — real transactions stay visible, attributed to the (soft-deleted) church |

**Deletion preconditions (both paths):**

Both the direct National `deleteChurch` and the Phase B approval path (`approveChurchDeletionRequest`) block deletion when the church has any **Pending** `PendingPayment`, `WriteOff`, or `UnmatchedPayment`. This prevents orphaning staging records against a deleted church, which would later block their approval or corrupt defunct-flag computation. The precondition check is identical on both paths, matching enterprise-grade consistency (SAP / NetSuite: preconditions must apply uniformly to every state-transition route).

**`softDeleteChurchTx` helper:** exported from `lib/church/soft-delete-tx.ts` (Unit 20.6b refactor). Both the direct `deleteChurch` path (Phase A) and `approveChurchDeletionRequest` (Phase B) import it.

**Deviation from Phase A spec, documented:** the spec said "defined locally (non-exported) in `lib/actions/church-actions.ts`, mirroring `computeChurchOutstanding`'s inline-in-actions-file house style". When Phase B was implemented, `church-deletion-request-actions.ts` needed the same logic — duplicating it would violate the single-source rule, and importing from `church-actions.ts` risked a circular import chain (the request-actions file already imports guards and audit-actions, which sit upstream of the actions layer). The helper was therefore extracted into `lib/church/soft-delete-tx.ts`. This stays within the "no new `lib/utils/*`" constraint (it is `lib/church/`, not `lib/utils/`) and preserves single-source-of-truth. Recorded under Architecture Decisions in `progress-tracker.md`.

Signature: `(tx: Prisma.TransactionClient, churchId: string) => Promise<{ deactivatedUserIds: string[] }>`. Must be called inside `prisma.$transaction`. Does **not** log audit — callers log after the transaction commits, per § 8 "AuditLog".

**Audit trail:**
- Direct `deleteChurch` — one event: `CHURCH_DELETED` with `metadata.soft_delete = true`, `after_data.deleted_at`, `after_data.deactivated_user_ids`.
- Phase B `approveChurchDeletionRequest` — two events: `CHURCH_DELETED` (with `metadata.source = 'deletion_request'`, `metadata.request_id`) and `CHURCH_DELETION_APPROVED` (on the request entity). Two distinct lifecycle events, both visible in the audit viewer.

### ChurchDeletionRequest (Unit 20.6b) — ✅ COMPLETE

Migration: `20261123010107_add_church_deletion_request` — creates the `ChurchDeletionRequest` table and its four indexes. Follows the `PendingPayment` / `UnmatchedPayment` precedent: `String` status (no Prisma enum), review-workflow field naming (`reviewed_by` / `reviewed_at`), and audit via `logAudit`.

**Purpose:** Registry-side request/approval workflow for church deletion. A Regional Chairman or Regional Treasurer proposes deletion for a church in their own region; a National Operations-domain role (`OPERATIONS_ADMIN`, `SYSTEM_ADMIN`, `NATIONAL_TREASURER`) approves or rejects. **Approval** soft-deletes the church (`Church.deleted_at`, from 20.6a) and deactivates its users atomically. **Rejection** preserves the church. The proposer can withdraw a `Pending` request before National review.

**Model fields:** `id`, `church_id`, `church` (relation), `reason` (String — `'DISSOLVED' | 'MERGED' | 'DUPLICATE' | 'OTHER'`), `notes` (String?), `status` (String — `'Pending' | 'Approved' | 'Rejected'`), `proposed_by`, `proposed_at`, `reviewed_by` (String?), `reviewed_at` (DateTime?), `rejection_reason` (String?), `resulted_in_deletion` (Boolean, default `false`).

**Indexes:** `@@index([church_id])`, `@@index([status])`, `@@index([proposed_by])`, `@@index([status, proposed_at])`.

**Back-relation on `Church`:** `deletion_requests ChurchDeletionRequest[]`.

**Reason taxonomy (enum-plus-`OTHER`, matching `WriteOff`'s String precedent — no Prisma enum):**
- `DISSOLVED` / `MERGED` / `DUPLICATE` — **standard**: known handling path, `notes` optional (`max 500`). Audit log emits `after_data.reason_category = 'standard'`.
- `OTHER` — **non-standard**: requires `min 100` / `max 500` characters of justification (`notes` field). Audit log emits `reason_category = 'non_standard'`. Surfaced in the approval queue with an amber **"Needs review"** badge next to the reason label — this is not a gate, it is a signal that the request needs concentrated approver attention. `OTHER` covers cases with no laid-down handling path: fraud, permanent relocation, legal intervention, leadership removal.

**Approver scope is uniform across all four reasons** — `verifyOperationsAccess()` on both approve and reject. Escalating `OTHER` to Treasurer-only was considered and rejected: it would weaken Operations Admin's registry authority. If the client later wants `OTHER` to require Treasurer, that's a one-line guard change plus a spec amendment — logged in `progress-tracker.md` → Open Questions.

**Proposer guard:** `verifyChurchDeletionRequestAccess(churchId)` — Regional roles only (`REGIONAL_CHAIRMAN` / `REGIONAL_TREASURER`), enforced `dbUser.region_id === church.region_id` server-side. National roles refused — they already have direct `deleteChurch` and should not be forced through the request workflow. Local roles refused.

**Four-eyes:** `proposed_by !== reviewed_by` on **both** approve and reject — returns `{ error }`, matching `approveWriteOff` / `rejectWriteOff` / `approvePendingPayment` / `rejectPendingPayment` precedent. Unreachable by role in practice (proposer is Regional; approver is National) but present as a hard backstop (see § 4 Four-Eyes Principle — Unit 20.6b extension).

**Atomic claim:** both approve and reject use `updateMany({ where: { id, status: 'Pending' } })` inside the surrounding `$transaction`; `claimed.count === 0` throws. Prevents double-click and concurrent double-approve, matching `approveWriteOff`.

**Approval-time blocking check:** if the church has any `Pending` `PendingPayment`, `Pending` `WriteOff`, or `Pending` `UnmatchedPayment`, approval returns `{ error: 'This church has unresolved financial exceptions. Resolve them before deleting.' }`. Prevents orphaning staging records against a deleted church — matches direct `deleteChurch` preconditions (see § 8 Church Soft Delete, "Deletion preconditions (both paths)").

**SLA thresholds (deletion-specific):** `CHURCH_DELETION_SLA_YELLOW_DAYS = 3`, `CHURCH_DELETION_SLA_RED_DAYS = 7`, from `lib/constants.ts`. **Deliberately tighter than the reconciliation SLA (7 / 30)** — a registry deletion request queued for 30 days is a governance liability (the church sits in limbo: users locked out of working workflows but still technically active), whereas a reconciliation item is a financial accounting question where a longer SLA is defensible. The queue renders `<SlaBadge status={...} ageDays={days_old} />` reusing the same primitive as reconciliation.

**Audit events (four new `AuditLog.action` values):**
- `CHURCH_DELETION_REQUESTED` — on propose. `after_data` includes `church_code`, `church_name`, `reason`, `reason_category`, `notes`.
- `CHURCH_DELETION_CANCELLED` — on proposer withdrawal. `after_data` includes `church_code`, `reason`.
- `CHURCH_DELETION_APPROVED` — on approve. `metadata` includes `request_id`, `church_code`, `approved_by_email`. Fires **alongside** `CHURCH_DELETED` (emitted by the 20.6a-rewritten `deleteChurch` via `softDeleteChurchTx`). Two distinct lifecycle events, both visible in the audit viewer.
- `CHURCH_DELETION_REJECTED` — on reject. `after_data` includes `rejection_reason`, `request_id`; `metadata` includes `church_code`, `rejected_by_email`.

**Deletion path on approval:** calls `softDeleteChurchTx` (imported from `lib/church/soft-delete-tx.ts` — see § 8 Church Soft Delete) inside `prisma.$transaction`. The transaction atomically: (a) claims the request via `updateMany`, (b) soft-deletes the church + deactivates its users. Audit events fire **after** the transaction commits, per § 8 "AuditLog" invariant.

**Approval-queue UI deviation:** the queue is an **action queue**, not a report. It deliberately omits `<TableToolbar>`, checkbox column, and export controls per `ui-context.md` § 6.1. This is documented as an intentional deviation from the report-table convention: mixing "approve this" with "select all 15 and export to Excel" invites the wrong interaction model. Regional "My Deletion Requests" tab follows the same constraint.

### LoginHistory (Unit 16.4 — Optional, Not Yet Scheduled)

Track login attempts for security monitoring. Fields: `id`, `user_id`, `ip_address`, `user_agent`, `success`, `created_at`.
