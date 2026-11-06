# Architecture Context

## 1. Stack
| Layer | Technology | Role |
|-------|------------|------|
| Framework | Next.js 16 (App Router) + TypeScript | Full-stack web framework |
| UI | Tailwind CSS + shadcn/ui (Base UI) | Styling and component library |
| UI Components | Recharts | Financial charts and data visualizations |
| Auth | Supabase Auth | Role-based authentication (Church, Region, National HQ) |
| Database | Supabase (PostgreSQL) | Relational data for Churches, Payments, Scores |
| ORM | Prisma v7 (via `@prisma/prisma7`) | Type-safe database queries and schema management |
| Validation | Zod | Schema validation for forms, API inputs, and webhook payloads |
| Database Connection | Supavisor (Supabase) | Connection pooling to handle high traffic |
| Integrations | KCB Bank API (Mocked for v1) | Listens for incoming payment webhooks (IPN) |
| Integrations | Africa's Talking SMS API (Mocked) | Automated SMS reminders and receipts |
| Background Jobs | Supabase Edge Functions / Inngest | Process webhooks, send SMS, calculate scores async |

### Important Architectural Notes
- **Prisma Workflow:** Due to Prisma v8 breaking changes, all Prisma commands must be run via `npx prisma7 <command>`. The database URL is stored in `prisma.config.ts`, not `schema.prisma`.
- **Next.js 16 Middleware:** The `middleware.ts` convention is deprecated. Route protection is handled by `proxy.ts`.
- **Case Sensitivity:** All imports and paths are case-sensitive. Avoid renaming folders after they have been pushed to GitHub to prevent sync issues.

## 2. System Boundaries
- `app/` — Next.js routes, layouts, and page composition. Contains dashboards for Church, Region, and National HQ.
- `app/api/webhooks/kcb/` — Endpoint to receive POST requests from the Mock KCB API.
- `components/` — Reusable UI components (tables, charts, KPI cards).
- `lib/` — Server helpers, Prisma client, and API clients (KCB/SMS).
- `prisma/` — Database schema and migrations.
- `jobs/` — Background worker functions (SMS reminders, score calculations).

## 3. Storage Model
- **Supabase (PostgreSQL):** Stores core relational data: Regions, Churches, Payments, Users, and Regional Scores.
- **No Blob Storage Needed:** All data is structured and relational.

## 4. Auth and Access Model
*Strict Hierarchical Access: National HQ \(\rightarrow\) Region \(\rightarrow\) Church*
*(Enforced via Supabase Row Level Security - RLS at the database level)*

- **National HQ Admin:** Has absolute visibility. Can view the single central KCB account totals, all 60 regions, all 1,600 church streams, and the Unmatched Payments queue.
- **Regional Chairman:** Can view aggregated totals and church payment histories strictly *within their assigned region only*. 
- **Church Treasurer:** Has the most restricted view. Can only see their own Church profile and payment history.
- **System Admin (Technical):** Manages user accounts, assigns roles, and handles system configuration via Supabase Auth.

### Communication Identity (SMS)
- **Universal Capability, Contextual Identity:** All authorized roles (National, Regional) can send SMS reminders. However, the SMS message body must reflect the sender's role.
- **Implementation:** The `sendReminder` and `sendBulkReminders` functions accept a `senderRole: 'NATIONAL' | 'REGIONAL'` parameter to stamp messages with the correct authority ("from the Maranatha National Office" vs "from the Maranatha Regional Office").

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

## 7. Financial Ledger & Carry-Forward (Deferred to Unit 10.0)
- **Current State:** The system calculates expected-to-date based on the current calendar year. Year-end arrears silently vanish on Jan 1st.
- **Required Upgrade (Unit 10.0):** 
  - Add `billing_year` to the `Payment` model.
  - Update `getExpectedToDate` to calculate cumulative expected vs. actual to track carry-forwards.
  - Activate the Month/Year view toggle in `TableToolbar`.