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
- **Idempotency:** Always query the database to check if a `transaction_id` already exists before inserting a new payment. Ignore duplicates gracefully.
- **Exports:** All export functionality must go through `lib/utils/export-advanced.ts` (supporting CSV, Excel, and branded PDFs). Do not use raw `Blob` or `URL.createObjectURL` directly in components.
- **Exports (Print):** The PDF export engine supports an `autoPrint` argument which triggers the browser print dialog.

## Data and Storage
- Use Prisma ORM for all database queries.
- Metadata and relational data belong in Supabase (PostgreSQL).
- **Atomic Transactions:** When a single action updates multiple tables (e.g., creating a payment record and updating a church status), use `prisma.$transaction` to ensure all changes succeed or fail together.

## File Organisation
- `app/` — routes, layouts, page-level composition.
- `components/` — reusable UI components.
- `lib/` — server helpers, data access, Prisma client, API integrations.
  - `lib/utils/export-advanced.ts` — Enterprise export engine (CSV, Excel, PDF).
- `prisma/` — schema and migrations.
- `context/` — the six context files and specs.

## Database Migrations
- **NEVER** run `prisma db push`. It skips the migration history and creates drift.
- **ALWAYS** use `prisma7 migrate dev --name <descriptive-name>` for local schema changes.
- **ALWAYS** commit the generated migration folder to Git.
- **For production:** use `prisma7 migrate deploy` (applies pending migrations without prompting).
- **NEVER** run `prisma7 migrate reset` against any database containing real data — it drops the entire schema.
- **Backup before migrating** any database that holds live data. Use `pg_dump` locally (Supabase Free Plan has no scheduled backups).
- **If drift is detected:** do NOT reset. Diagnose with `prisma7 migrate status` and follow the baseline-repair procedure.

## Authentication & Protected Accounts
- **SYSTEM_ADMIN role is reserved for the vendor/platform owner.** It has the same capabilities as National Treasurer, plus protection from UI-level deletion/deactivation by other users.
- **Protected User IDs** are stored in `lib/auth/protected-users.ts` as a hardcoded array. Any server action that mutates users MUST check this list and reject operations on protected IDs.
- **Protected users are hidden** from the `/dashboard/users` list unless the viewer is also SYSTEM_ADMIN.
- **Never auto-create SYSTEM_ADMIN accounts** via inviteUser. They must be created manually via the Supabase dashboard or a one-off seed script.
- **Client handover checklist:** Before handing credentials to the client, verify that (a) at least one SYSTEM_ADMIN account exists and is protected, (b) the client's National Treasurer account is separate, (c) the client CANNOT see the SYSTEM_ADMIN account in their Users list.

## Known ESLint Configuration Gaps
- **`argsIgnorePattern` is NOT set.** Underscore-prefixed parameters (e.g., `_options`) are still flagged as unused. Use `void` to mark intentionally unused parameters, or remove them entirely.
- **`@typescript-eslint/no-explicit-any` is enforced.** Never use `any`. Use `unknown` + narrowing, or define an explicit type.
- **`react/no-unescaped-entities` is enforced.** Quote, apostrophe, and angle-bracket characters in JSX text must be escaped (`&quot;`, `&apos;`, `&lt;`, `&gt;`) or wrapped in `{}` expressions.

## SMS Actions API
- **`sendBulkReminders(recipients, senderRole)`** takes exactly **2 arguments**.
  - `recipients` — an array of recipient records (each with `phone` and context data).
  - `senderRole` — `'NATIONAL' | 'REGIONAL'`.
- **Do NOT reintroduce a third `periodView` argument.** The previous signature was simplified during Phase 1 lint cleanup because `periodView` was unused. If a future feature genuinely needs period context, add it explicitly in a new spec and update this rule.

## Future Considerations (V2 Planned)
- **Fuzzy Matching:** When implementing UnmatchedPayment suggestion logic, use `fastest-levenshtein` (not native string diff). Target: <5ms per comparison.
- **PaymentIntent Polling:** When the user clicks "Verify Payment" in the wizard, poll every 3s for up to 2 minutes. Show progress. Auto-expire intent after 10 minutes.
- **Audit Log Immutability:** `AuditLog` records are append-only. No updates, no deletes. Even SYSTEM_ADMIN cannot purge.
- **React Hooks:** Use `useSyncExternalStore` for external subscriptions, never `useEffect` + `setState` for that purpose.

## Protected Files
- `components/ui/*` — generated component library; never edit manually. *(Exception: Global dialog standards are applied in `dialog.tsx` and `alert-dialog.tsx`)*.
- `lib/prisma.ts` — managed Prisma client.
- `lib/utils.ts` — contains the extended `twMerge` configuration for custom Figma tokens. Do not reset to default.