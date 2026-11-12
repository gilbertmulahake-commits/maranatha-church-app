# Architecture Context

## 1. Stack
| Layer | Technology | Role |
|-------|------------|------|
| Framework | Next.js 16 (App Router) + TypeScript | Full-stack web framework |
| UI | Tailwind CSS + shadcn/ui (Base UI) | Styling and component library |
| UI Components | Recharts | Financial charts and data visualizations |
| Auth | Supabase Auth | Role-based authentication (Church, Region, National HQ, System Admin) |
| Database | Supabase (PostgreSQL) | Relational data for Churches, Payments, Scores |
| ORM | Prisma v7 (via `@prisma/prisma7`) | Type-safe database queries and schema management |
| Validation | Zod | Schema validation for forms, API inputs, and webhook payloads |
| Database Connection | Supavisor (Supabase) | Connection pooling to handle high traffic |
| Integrations | KCB Bank API (Mocked for v1) | Listens for incoming payment webhooks (IPN) |
| Integrations | Equity Bank API (Planned for v2) | Dual-bank support via Jenga API |
| Integrations | Africa's Talking SMS API (Sandbox configured) | Automated SMS reminders and receipts |
| Exports | `xlsx`, `jspdf`, `jspdf-autotable` | Generates Excel and branded PDF reports |
| Background Jobs | Supabase Edge Functions / Inngest | Process webhooks, send SMS, calculate scores async |

### Important Architectural Notes
- **Prisma Workflow:** Due to Prisma v8 breaking changes, all Prisma commands must be run via `npx prisma7 <command>`. The database URL is stored in `prisma.config.ts`, not `schema.prisma`.
- **Next.js 16 Middleware:** The `middleware.ts` convention is deprecated. Route protection is handled by `proxy.ts`.
- **Case Sensitivity:** All imports and paths are case-sensitive. Avoid renaming folders after they have been pushed to GitHub to prevent sync issues.
- **Tailwind Merge Configuration:** Because we use custom Figma typography tokens (e.g., `text-heading-1`, `p-xl`), we extended `tailwind-merge` in `lib/utils.ts`. This prevents `twMerge` from silently dropping our custom classes when they conflict with standard Tailwind colors or sizes. Do not remove this configuration.
- **Migration Workflow (Unit 15 Phase 1):** Migration history was repaired with a baseline migration (`00000000000000_baseline`) after a history gap was discovered (two early migrations existed on the DB but not locally). Rules going forward:
  - **NEVER** run `prisma db push` — it skips migration history and creates drift.
  - **ALWAYS** use `prisma7 migrate dev --name <descriptive>` for local changes.
  - **ALWAYS** commit the generated migration folder to Git.
  - Production deploys use `prisma7 migrate deploy` (never `migrate dev` on prod).
  - **NEVER** run `prisma7 migrate reset` against a database containing real data.
- **Backup Policy:** Supabase Free Plan does **not** include scheduled backups. Use `pg_dump` locally before any destructive operation: `pg_dump "<connection-string>" --no-owner --no-acl --format=plain --file=backup_<date>.sql`. Store dumps outside the repo (`.gitignore` should exclude `*.sql`).
- **Pastorate Layer (LIVE, DORMANT):** The `Pastorate` model was added in Unit 15 Phase 1. The `Church.pastorate_id` FK is nullable and the layer is **not used** in any financial calculation or UI. It exists to support an optional `National → Region → Pastorate → Church` hierarchy if the Ministry adopts it. Do not build UI or business logic against it without an explicit spec.
- **User Bio-Data (LIVE):** The `User` model now has `first_name`, `last_name`, `phone`, `profile_photo_url`, and `bio` — all nullable. Profile UI (Phase 5) will consume these. Do not add non-null constraints or defaults without an explicit migration.
- **Church Profile Fields (LIVE):** The `Church` model now has `physical_address` (String?) and `membership_count` (Int?), both nullable. Reserved for future reporting features.
- **Bank Adapter Pattern (Future):** The system is architected to support dual-bank webhooks (KCB + Equity). Both will normalize their payloads into a standard `NormalizedTransaction` shape before hitting the Reconciliation Engine. This allows the Ministry to drop or add banks without affecting the allocation logic.
- **Sandbox Integration Mode:** Both KCB (Buni API) and Equity (Jenga API) integrations will utilize their respective sandbox environments for development, staging, and UAT. The system will only switch to live production endpoints once the client provides the live credentials. A `BANK_ADAPTER_MODE` environment variable will handle the toggle between `mock`, `sandbox`, and `live`.
- **Dynamic Fund & Channel Architecture (Future):** The current `PaymentType` and `PaymentMethod` enums will be migrated to `Fund` and `PaymentChannel` tables in V2. This enables admin-created payment categories (e.g., "Bishop's Retreat 2027") without code changes.

## 2. System Boundaries
- `app/` — Next.js routes, layouts, and page composition. Contains dashboards for Church, Region, and National HQ.
- `app/api/webhooks/kcb/` — Endpoint to receive POST requests from the Mock KCB API.
- `components/` — Reusable UI components (tables, charts, KPI cards).
- `lib/` — Server helpers, Prisma client, and API clients (KCB/SMS).
- `lib/utils/export-advanced.ts` — Enterprise export engine (CSV, Excel, PDF, Print).
- `prisma/` — Database schema and migrations.
- `jobs/` — Background worker functions (SMS reminders, score calculations).

## 3. Storage Model
- **Supabase (PostgreSQL):** Stores core relational data: Regions, Churches, Payments, Users, and Regional Scores.
- **No Blob Storage Needed:** All data is structured and relational.

## 4. Auth and Access Model
*Strict Hierarchical Access: National HQ \(\rightarrow\) Region \(\rightarrow\) Church*
*(Enforced via Supabase Row Level Security - RLS at the database level)*

### Role-Based Access Control (RBAC) Matrix
| Role(s) | Sidebar Tabs | Core Focus |
| :--- | :--- | :--- |
| **SYSTEM_ADMIN** (Vendor/Owner) | All tabs | Full access + Protected User Management. Cannot be edited/deleted by anyone else via UI. Hidden from Users list unless viewer is also SYSTEM_ADMIN. |
| **National Treasurer / Overseer** | Dashboard, Regions, Churches, Payments, Users, Mock KCB, Reports, Settings | Full financial oversight, user management, and system settings. |
| **Regional Chairman / Treasurer** | Regional Dashboard, Regional Payments, Reports, Settings | Regional compliance monitoring, drill-downs, and bulk SMS. |
| **Local Pastor / Church Treasurer** | Local Dashboard, Reports, Settings | Personal church compliance, exact bucket status, and payment history. |

### Protected Accounts (SYSTEM_ADMIN)
- SYSTEM_ADMIN users are stored in the `User` table but flagged as protected via a hardcoded allowlist (see `lib/auth/protected-users.ts`).
- **No user, regardless of role, can:**
  - Delete a SYSTEM_ADMIN account via the UI
  - Change a SYSTEM_ADMIN's role via the UI
  - Deactivate a SYSTEM_ADMIN via the UI
- Protected accounts are excluded from `/dashboard/users` list by default (visible only to other SYSTEM_ADMIN users).
- Any attempt to manage a protected account returns a 403 in the server action.
- Manual intervention is only possible via direct Supabase dashboard access (which only the vendor holds).

### Detailed Role Definitions
- **SYSTEM_ADMIN:** Vendor/Owner account. Has the same capabilities as National Treasurer, plus protection from UI-level deletion/deactivation. Managed only via Supabase dashboard.
- **National HQ Admin:** Has absolute visibility. Can view the single central KCB account totals, all 60 regions, all 1,600 church streams, and the Unmatched Payments queue.
- **Regional Chairman / Treasurer:** Can view aggregated totals and church payment histories strictly *within their assigned region only*. 
- **Local Pastor / Church Treasurer:** Has the most restricted view. Can only see their own Church profile and payment history.

### Communication Identity (SMS)
- **Universal Capability, Contextual Identity:** All authorized roles (National, Regional) can send SMS reminders. However, the SMS message body must reflect the sender's role.
- **Implementation:** The `sendBulkReminders(recipients, senderRole)` function accepts exactly two arguments — `recipients` (array) and `senderRole: 'NATIONAL' | 'REGIONAL'` — to stamp messages with the correct authority ("from the Maranatha National Office" vs "from the Maranatha Regional Office").

## 5. Invariants (Rules the code must NEVER violate)
1. **Webhook Security:** Every incoming payment webhook from KCB must be verified using a secure secret/signature before processing.
2. **Data Isolation (RLS):** A Regional Chairman must *never* be able to query or view data belonging to a church outside their assigned region. This must be enforced at the database level via RLS policies.
3. **Idempotency:** If a KCB payment webhook is received twice (due to network retries), the system must not double-count the payment. (Check the KCB `transaction_id` against existing records before processing).
4. **Async Processing:** Sending SMS messages and calculating heavy regional scores must *never* run in the main request-response cycle. They must go to background workers.
5. **Reconciliation Mapping:** Every KCB payment must contain a `BillRefNumber` (Church ID). If the ID does not match an active church, the payment goes to an "Unmatched" table for HQ manual review, never discarded.
6. **Atomic Financial Mutations:** Any operation that modifies payment records, church totals, or regional scores must use database transactions (e.g., `prisma.$transaction`) to ensure data integrity. If one step fails, all steps roll back.

## 6. Financial Flow Model
- **Centralized Bank Account:** There is only ONE KCB Bank Account. The database does NOT store individual church bank accounts. 
- **Stream Allocation:** Every payment received is treated as a "stream" that must be allocated to a `Church` record via the `church_code` (`BillRefNumber`).
- **Unallocated Funds:** Any funds received that do not match a valid `church_code` remain in an "Unallocated/Unmatched" pool at the National HQ level until manually reconciled by an admin. 

## 7. Financial Ledger & Strict Bucket Isolation
- **Cumulative Ledger:** The system calculates expected amounts cumulatively from a church's `created_at` date. Year-end arrears do not vanish on Jan 1st.
- **Strict Bucket Isolation:** Annual contributions (KES 5,000) and Monthly contributions (KES 500) are treated as completely separate ledgers. An overpayment in one bucket does not cover a shortfall in the other.
- **Dynamic Statuses:** A church's status is evaluated per bucket (`annualStatus` vs `monthlyStatus`). The UI dynamically swaps the badge and KPI counts based on the active `periodView` (Month/Year). If a church owes 0 in a bucket (e.g., joined after the annual deadline), it shows an `N/A` status.
- **Carry-Forward & Prepayments:** Handled implicitly via the cumulative math. The UI explicitly surfaces `annualCredit` and `monthlyCredit` rather than a generic total credit.
- **Allocation Engine:** Payment records remain immutable 1:1 bank ledger entries. Annual/Monthly attribution is handled purely via the `PaymentAllocation` table, allowing for mixed deposits and future prepayments without breaking reconciliation.
- **Fund Accounting (Future):** All payments are currently split into `Annual` and `Monthly` buckets. In V2, the system will support arbitrary **Funds**. Each fund is a separate ledger. The Reconciliation Engine will route incoming funds based on a fund code included in the payment reference (e.g., `CH001-BUILD`).

## 8. Future Schema Additions (V2 Planned)

### UnmatchedPayment (Unit 17)
For webhook payments that fail BillRefNumber matching. Required by Invariant #5.
Fields: id, bank_reference, bank_name, raw_bill_ref, amount, payer_phone, raw_payload (JSON), status, suggested_church_id, assigned_church_id, assigned_payment_id, reviewed_by, reviewed_at, notes, created_at.

### PaymentIntent (Unit 18)
For the guided payment wizard to track in-progress payments and match them to incoming webhooks within a time window.
Fields: id, church_id, amount, payment_type, phone, status, matched_payment_id, created_by, expires_at, created_at.

### AuditLog (Unit 16.3)
System-wide mutation tracking for compliance. Every payment, church, user, and settings change is logged.
Fields: id, user_id, action, entity, entity_id, metadata (JSON), ip_address, created_at.
**Append-only**: no updates, no deletes, even by admin.

### LoginHistory (Unit 16.4, optional)
Track login attempts for security monitoring. Fields: id, user_id, ip_address, user_agent, success, created_at.