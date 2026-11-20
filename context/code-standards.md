# Code Standards

## General
- Keep modules small and single-purpose.
- Fix root causes, do not layer workarounds.
- Do not mix unrelated concerns in one component or route.

## TypeScript
- Strict mode is required throughout the project.
- Avoid `any` — use explicit interfaces, narrowly scoped types, or `unknown` + narrowing.
- Validate unknown external input (especially webhooks) at system boundaries before trusting it.

## Framework (Next.js)
- Default to server components.
- Add `use client` only when browser interactivity requires it.
- Keep route handlers focused on a single responsibility.

## Styling
- Use CSS custom property tokens — no hardcoded hex values.
- Use `tabular-nums` for all financial figures.
- Use `components/ui/*` for standard elements (buttons, inputs). Do not modify them directly. *(Exception: `ui/dialog.tsx`, `ui/alert-dialog.tsx`, and `ui/table-toolbar.tsx` have been globally customized for enterprise standards).*
- **Tailwind Merge:** `lib/utils.ts` is configured to protect custom Figma tokens (e.g., `text-heading-1`). Do not reset `twMerge` to default.

## API Routes, Webhooks & Exports
- Validate and parse all incoming request bodies using **Zod** schemas before any business logic runs.
- Verify webhook signatures immediately upon receiving a request.
- Enforce auth and ownership before any mutation.
- Return consistent, predictable response shapes.
- **Idempotency:** Always query the database to check if a `transaction_id` already exists before inserting a new payment. Ignore duplicates gracefully. **Unit 17:** Idempotency checks BOTH `Payment.transaction_id` AND `UnmatchedPayment.bank_reference` in the KCB webhook. **Unit 19:** STK Push callbacks and status queries extend idempotency to `PaymentIntent.provider_request_id` and `PaymentIntent.provider_receipt`. A payment confirmed via STK Push and also via C2B webhook must produce exactly one `Payment` row. Enforce via database unique constraints, not application check-then-insert.
- **Exports:** All export functionality must go through `lib/utils/export-advanced.ts` (supporting CSV, Excel, and branded PDFs). Do not use raw `Blob` or `URL.createObjectURL` directly in components.
- **Exports (Print):** The PDF export engine supports an `autoPrint` argument which triggers the browser print dialog.
- **Unmatched capture (Unit 17):** When a webhook cannot find its target church, do NOT return 404. Capture it in `UnmatchedPayment` with the top fuzzy suggestion, log `UNMATCHED_PAYMENT_CAPTURED`, and return HTTP 200 so the bank stops retrying.
- **Payload Types:** Server Actions that handle forms (like `createManualEntry` or `proposeWriteOff`) MUST accept `FormData` and use `formData.get()`. Do not pass raw objects directly from the client to these specific actions.

## Data and Storage
- Use Prisma ORM for all database queries.
- Metadata and relational data belong in Supabase (PostgreSQL).
- **Atomic Transactions:** When a single action updates multiple tables (e.g., creating a payment record and updating a church status), use `prisma.$transaction` to ensure all changes succeed or fail together.

## File Organisation
- `app/` — routes, layouts, page-level composition.
- `components/` — reusable UI components.
  - `components/reports/analytics/` — Unit 18.2 analytics report tables (Collections Summary, Compliance, Regional Scores, YoY Comparison view + chart, Allocation Breakdown, Source/Method).
- `lib/` — server helpers, data access, Prisma client, API integrations.
  - `lib/actions/report-actions.ts` — Read-only report server actions (18.1 core + 18.2 analytics).
  - `lib/utils/export-advanced.ts` — Enterprise export engine (CSV, Excel, PDF).
  - `lib/utils/matching.ts` — Unit 17 Solutions Bank (Levenshtein + pattern learning).
  - `lib/utils/financial.ts` — Cumulative ledger helpers + `isChurchCompliant` (Unit 18.2 compliance single source of truth).
  - `lib/utils/report-scope.ts` — `buildChurchWhere`, `buildPaymentWhere`, `scopeByRole` (Unit 18.1 + 18.2).
  - `lib/utils/report-registry.ts` — Report slug/title/description/group/role visibility (Unit 18.2 single source of truth).
  - `lib/auth/guards.ts` — Centralized RBAC verification helpers.
  - `lib/auth/roles.ts` — Role predicates + `toReportRole`.
- `prisma/` — schema and migrations.
- `context/` — the six context files and specs.

## Database Migrations
- **NEVER** run `prisma db push`. It skips the migration history and creates drift.
- **ALWAYS** use `prisma7 migrate dev --name <descriptive-name>` for local schema changes.
- **ALWAYS** run `npx prisma7 generate` after any migration to refresh the TypeScript client.
- **ALWAYS** commit the generated migration folder to Git.
- **For production:** use `prisma7 migrate deploy` (applies pending migrations without prompting).
- **NEVER** run `prisma7 migrate reset` against any database containing real data — it drops the entire schema.
- **Backup before migrating** any database that holds live data. Use `pg_dump` locally (Supabase Free Plan has no scheduled backups).
- **If drift is detected:** do NOT reset. Diagnose with `prisma7 migrate status` and follow the baseline-repair procedure.
- **Backfill discipline:** When adding a new field with a default (e.g., `Payment.source`), always document the required production backfill query in the migration folder or handoff doc. Never deploy without applying it.
- **Cold-cache `tsc`:** On a fresh clone, `tsc --noEmit` alone cannot resolve Next.js's generated `LayoutProps<"/">`. Run `npx next typegen` (or `npm run build`) first to populate `.next/types/routes.d.ts`.
- **Stale `tsc` after `prisma7 generate`:** Adding a new delegate (e.g. `PaymentIntent` in Unit 19) is invisible to `tsc` if `tsconfig.tsbuildinfo` from before the generate is still on disk — the incremental cache serves the pre-generate `PrismaClient` type. Symptom: `Property 'X' does not exist on type 'PrismaClient'` on the first file that references the new delegate, while `findstr` against `node_modules\.prisma\client\index.d.ts` shows the delegate is present. **Fix:** `del tsconfig.tsbuildinfo` (or `npx tsc --noEmit --incremental false` to confirm the diagnosis without deleting). Do **not** run `prisma7 generate` again — the client is already correct; the cache is the problem.

## Authentication & Protected Accounts
- **SYSTEM_ADMIN role is reserved for the vendor/platform owner.** It has the same capabilities as National Treasurer, plus protection from UI-level deletion/deactivation by other users.
- **Protected User IDs** are stored in `lib/auth/protected-users.ts` as a hardcoded array. Any server action that mutates users MUST check this list and reject operations on protected IDs.
- **Protected users are hidden** from the `/dashboard/users` list unless the viewer is also SYSTEM_ADMIN.
- **Never auto-create SYSTEM_ADMIN accounts** via inviteUser. They must be created manually via the Supabase dashboard or a one-off seed script.
- **Client handover checklist:** Before handing credentials to the client, verify that (a) at least one SYSTEM_ADMIN account exists and is protected, (b) the client's National Treasurer account is separate, (c) the client CANNOT see the SYSTEM_ADMIN account in their Users list.

## RBAC Guard Pattern (Unit 16.5 / 18.1)
- **All mutations** must call the appropriate guard at the top of the `try` block:
  - `verifyOperationsAccess()` — Church/Region/User mutations (Operations Admin or Treasurer)
  - `verifyFinanceAccess()` — Payment mutations (Finance Admin or Treasurer)
  - `verifyReconciliationAccess()` — Reconciliation reads/resolutions (Finance Admin, Treasurer, or System Admin)
  - `verifyTreasurerAuthority()` — Approvals and write-offs (Treasurer or System Admin only)
  - `verifyReportsAccess()` — All report reads (any authenticated role; scoping via `buildChurchWhere` / `buildPaymentWhere` / `scopeByRole` — Invariant 2)
- If the caller lacks permission, the guard throws — the `catch` block converts this into a `{ error: 'Forbidden' }` return shape.
- **Separation of Duties:** `FINANCE_ADMIN` handles money; `OPERATIONS_ADMIN` handles registry/users. Neither can do the other's job. `SYSTEM_ADMIN` can do both.

## Known ESLint Configuration Gaps
- **`argsIgnorePattern` is NOT set.** Underscore-prefixed parameters (e.g., `_options`) are still flagged as unused. Use `void` to mark intentionally unused parameters, or remove them entirely.
- **`@typescript-eslint/no-explicit-any` is enforced.** Never use `any`. Use `unknown` + narrowing, or define an explicit type.
- **`react/no-unescaped-entities` is enforced.** Quote, apostrophe, and angle-bracket characters in JSX text must be escaped (`&quot;`, `&apos;`, `&lt;`, `&gt;`) or wrapped in `{}` expressions.
- **`react-hooks/set-state-in-effect` is enforced.** Never call `setState()` synchronously inside `useEffect`. Move state resets to event handlers. Effects should only do: `async fetch → setState in callback`.

## SMS Actions API
- **`sendBulkReminders(recipients, senderRole)`** takes exactly **2 arguments**.
  - `recipients` — an array of recipient records (each with `phone` and context data).
  - `senderRole` — `'NATIONAL' | 'REGIONAL'`.
- **Do NOT reintroduce a third `periodView` argument.** The previous signature was simplified during Phase 1 lint cleanup because `periodView` was unused. If a future feature genuinely needs period context, add it explicitly in a new spec and update this rule.

## Frontend Behavior Rules

### Auth Redirects — Always Hard Reload
- **Login and Logout MUST use `window.location.replace()`**, never `router.push()`.
- Reason: `router.push()` retains the Next.js Router Cache, which can resurrect stale React state (spinners, form values) and cause "ghost signing-in" bugs.
- Files affected: `login/page.tsx`, `components/layout/nav-user.tsx`, `components/layout/topbar.tsx`.

### Base UI Primitives — Critical Rules

**`<Select>` nullability:**
- Base UI's `<Select onValueChange>` passes `string | null` (not `string`).
- **Never cast** with `as string`. Always guard: `if (val) { ... }`, or widen the handler to accept `string | null`.
- Files: `region-table.tsx`, `regional-table.tsx`, `local-payment-history.tsx`, `resolve-dialog.tsx`, `manual-entry-form.tsx`, `propose-writeoff-dialog.tsx`, `collections-summary-table.tsx`, `allocation-breakdown-table.tsx`, `yoy-comparison-view.tsx`, `source-method-view.tsx` (all pattern `handleStatusFilterChange` / `handleChurchChange` / `handleRegionChange`).

**`<SelectValue>` UUID rendering bug:**
- When a `<Select>` holds a database ID, Base UI will display the raw UUID (e.g., `fc224644...`) instead of the human-readable name.
- You MUST explicitly pass the display string as a child of `<SelectValue>`:
  ```tsx
  <SelectValue placeholder="Select a church...">
    {selectedChurch ? `${selectedChurch.church_code} — ${selectedChurch.church_name}` : undefined}
  </SelectValue>
  ```

**`<TooltipTrigger>` context requirement:**
- Every `<TooltipTrigger>` MUST be a child of `<Tooltip.Root>`.
- Never conditionally return a `<TooltipTrigger>` outside its `<Tooltip.Root>` — Base UI throws a runtime error.
- Base tooltip styling in `components/ui/tooltip.tsx` uses `w-max !min-w-max whitespace-normal break-words max-w-[300px]`. Never add `whitespace-nowrap` or `flex` to `TooltipPopup` — it collapses the content vertically.

### Standardized Dialog Widths (Preventing Flexbox Collapse)
- Never leave `DialogContent` without explicit width constraints, or it will collapse to a 40px vertical sliver inside a flex parent.
- **Standard:** `w-[95vw] sm:w-full sm:max-w-[500px] p-6 max-h-[90vh] overflow-y-auto`
- **Wide:** `w-[95vw] sm:w-full sm:max-w-[600px] p-6` (Use only for complex forms like the Resolve Unmatched dialog).
- Always apply `flex-col-reverse sm:flex-row gap-2` to `<DialogFooter>` for responsive button stacking.

### `<Textarea>` Component
- Official shadcn `<Textarea>` from `components/ui/textarea.tsx` (added in Unit 17 via `npx shadcn@latest add textarea`).
- Always type the change handler: `(e: ChangeEvent<HTMLTextAreaElement>) => ...` — never rely on implicit typing.

### Supabase Auth — Email Template Requirement
- **Reset password, magic link, and invite flows MUST use `{{ .TokenHash }}`** (not the PKCE `?code=` flow).
- Use `supabase.auth.verifyOtp({ type: 'recovery', token_hash })` on the landing page.
- Reason: `@supabase/ssr` auto-exchanges PKCE codes in the middleware, racing with manual exchange and causing intermittent auth failures.
- Update Supabase Dashboard → Auth → Email Templates accordingly.

### Component Reuse (Single Source of Truth)
Never re-implement these — always use the component:
| Pattern | Component | Location |
| :--- | :--- | :--- |
| KPI grid layout | `<KpiGrid>` | `components/ui/kpi-grid.tsx` |
| KPI number typography | `<KpiValue>` | `components/ui/kpi-value.tsx` |
| Table wrapper (with `overflow-x-auto`) | `<TableShell>` | `components/ui/table-shell.tsx` |
| Print button (icon-only on mobile) | `<PrintButton>` | `components/ui/print-button.tsx` |
| Export dropdown (icon-only on mobile) | `<ExportDropdown>` | `components/ui/export-dropdown.tsx` |
| Table toolbar (search + filters + bulk) | `<TableToolbar>` | `components/ui/table-toolbar.tsx` |
| SLA age badge (green/yellow/red) | `<SlaBadge>` | `components/reconciliation/sla-badge.tsx` |
| Readable Payment Methods | `getReadableMethod()` | `components/payments/payments-table.tsx` (Maps `M_Pesa` → `M-Pesa`, `Cheque` → `Cheque`) |
| Report slug/title/description/visibleTo | `getReportBySlug` / `getReportsForRole` | `lib/utils/report-registry.ts` |
| Role → report visibility bucket | `toReportRole` | `lib/auth/roles.ts` |
| Compliance rule (Strict Bucket Isolation) | `isChurchCompliant` | `lib/utils/financial.ts` |

If a pattern appears in 3+ files and a component exists for it, use the component. Never re-inline.

## SMS Safety Invariant (Preserve During Refactors)
- `safeLogSms()` in `lib/actions/sms-actions.ts` swallows `SmsLog` DB write failures so that a **successful Africa's Talking send always returns `{ success: true }`**.
- Never change this: **DB log failure must not surface as SMS-send failure**. If it does, the UI retries and sends duplicate messages to the pastor.
- Africa's Talking phone format is **E.164** (`+254...`), NOT local (`0...`). `normalizeKenyanPhone()` handles conversion — never call the AT API with a raw DB phone value.
- **Never send `from: 'sandbox'`** — AT returns `InvalidSenderId`. Omit `from` entirely.

## Reconciliation Patterns (Unit 17)

### Four-Eyes Threshold
- **KES 20,000** (`FOUR_EYES_THRESHOLD` exported from `lib/constants.ts` — single source of truth).
- Above threshold OR 90+ day arrears → route to `PendingPayment` staging (never create `Payment` directly).
- **Write-offs ALWAYS require Treasurer approval** regardless of amount (absolute four-eyes — prevents fraud from hiding behind "write-off" labels).

### Separation of Duties (Four-Eyes Hardening)
- **Server-Side Enforcement:** Both `approvePendingPayment` and `approveWriteOff` MUST check `if (proposerId === actorId)` and throw an error. 
- **Never trust the UI:** Even if the UI hides the approve button, the server action must explicitly block a user from approving their own proposal.
- **Applies to:** Unmatched resolutions (>20K), Manual Entries (>20K), and ALL Write-Offs (regardless of amount).

### Solutions Bank
- Every successful `resolveUnmatched` calls `recordResolution()` — upserts a `ResolutionPattern` row keyed by `(raw_reference_pattern, resolved_church_code)`.
- Confidence formula: `min(100, 50 + hit_count * 10)` — 1 hit = 60%, 2 = 70%, 3 = 80%, 4 = 90%, 5+ = 100%.
- `suggestMatches()` checks patterns BEFORE running Levenshtein.
- **Never auto-commits a resolution** — surfaces suggestions only; human confirmation is required.

### PendingPayment Staging
- High-value manual entries / resolutions create a `PendingPayment` row — **NEVER a `Payment` directly**.
- Only after Treasurer approval does the real `Payment` get created (inside a single `$transaction` that also updates `PendingPayment.status = 'Approved'` and links `resulting_payment_id`).
- The immutable bank ledger never sees a "pending" state.

### Hybrid Allocation
- Server computes FIFO allocations via `computeExpectedPeriods` + `calculateAllocations` (same logic as KCB webhook Auto mode).
- Client receives the preview and can override each row before submission.
- Only after confirmation does a real `Payment` + `PaymentAllocation[]` get created.

### Write-Off Accounting (IFRS 9 / IPSAS 29)
- Obligation is **never reduced** from `getExpectedUpToDate()` — the debt truly existed.
- Write-offs are subtracted from `outstanding` via `sumApprovedWriteOffs()` + `getNetOutstanding()`.
- Aging buckets reduced **FIFO** (oldest debt written off first) — so 90+ bucket shrinks before 0-30 bucket.
- Reports must show the full reconciliation.

## Reporting Patterns (Unit 18.2)

### Report Action House Style
- All report reads use `'use server'` + `verifyReportsAccess()` at the top of the `try` block.
- Use `buildChurchWhere(dbUser)` / `buildPaymentWhere(dbUser, regionId?)` for scoping — never inline role checks.
- Return `Promise<TypedRow[]>`. On error: `catch → console.error → return []`. Empty array means "no data **or** query failed" — a known limitation tracked for future hardening (a discriminated `{ data } | { error }` result is a candidate).
- Row types exported at the top of `lib/actions/report-actions.ts`.

### Report Registry — Single Source of Truth
- Every report slug, title, description, group, and `visibleTo` lives in `lib/utils/report-registry.ts`.
- Three consumers: hub (`app/dashboard/reports/page.tsx`), dynamic resolver (`app/dashboard/reports/[report]/page.tsx`), and `<ReportSelector>` (`components/reports/report-selector.tsx`).
- **Never** duplicate a slug, title, or description in a component. Use `getReportBySlug(slug)` or `getReportsForRole(actorRole)`.
- Role mapping: `toReportRole(role)` in `lib/auth/roles.ts` — never re-derive role → bucket logic elsewhere.
- Adding a report = one new entry in `REPORTS` + one new `else if` branch in the `[report]` page + one new table component. No other file changes.

### Compliance Rule — Single Implementation
- The Strict Bucket Isolation compliance rule (`annualStatus === 'Paid' && monthlyStatus === 'Paid'`) lives in `lib/utils/financial.ts` → `isChurchCompliant(church, now)`.
- Called by `scoring-actions.ts` **and** `getComplianceReport()`. **Never re-implement in a new report.**

### Region Narrowing
- For National-role region filters, extend `buildPaymentWhere(dbUser, regionId?)` — do not merge `region_id` filters manually per-report.
- Regional / Local callers ignore `regionId`; the scope helper already fails closed for them.

### Rank-Preserving Scoping
- When a report returns a ranked list (e.g., Regional Scores), apply `scopeByRole(sortedRows, dbUser)` from `lib/utils/report-scope.ts`.
- Rank is computed **before** filtering, so a Regional viewer sees their region's true global rank — not "Rank 1 of 1".

### Bucket Isolation in Reports
- Annual and Monthly always occupy **separate columns**. Never render a combined "Total Collected" cell.
- Written-off amounts appear as a distinct "Less Written Off" column, never silently netted into "Collected".

### YoY Basis
- Year-over-year comparison is **cash received — calendar year of `payment_date`**, not `billing_year` attribution. Prepayments count in the year cash arrived. The page subtitle states this so readers don't confuse it with obligation satisfaction.

### Allocation Reconciliation Column
- Allocation Breakdown always carries a mandatory discrepancy column: Σ `PaymentAllocation.amount` must equal Σ `Payment.amount` in scope. Nonzero → `text-destructive` + `<AlertTriangle>` icon. Purpose: surface silent allocation defects at report time, not in a later audit.

### Score Placeholder Disclosure
- The 40/30/20/10 Regional Incentive Score has one real axis (`compliancePct`) and three placeholder axes (`timelinessPct`, `reportingAccuracy`, `leadershipEngagement`).
- Until Unit 18.2.1 instruments the placeholder axes, **never render them as measurements** in a report table. The dashboard leaderboard Score column header carries a `<Tooltip>` disclosing the limitation.

### Arrears Aging — Single Implementation
- `getAgingBuckets(church, ledger, now?)` in `lib/utils/financial.ts` is the **only** implementation of arrears aging (0-30 / 31-60 / 61-90 / 90+ day buckets).
- Called by `dashboard-actions.ts` (`'Combined'` — with FIFO write-off reduction) and `report-actions.ts` → `getArrearsAgingReport` (`'Annual'` / `'Monthly'` — GROSS, no write-off reduction because `WriteOff` has no ledger attribution).
- Do not re-implement bucket math in a new report. Extend `getAgingBuckets` if a new ledger mode is needed, but never inline.