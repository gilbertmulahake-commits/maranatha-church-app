# Code Standards

## General
- Keep modules small and single-purpose.
- Fix root causes, do not layer workarounds.
- Do not mix unrelated concerns in one component or route.

## TypeScript
- Strict mode is required throughout the project.
- Avoid `any` — use explicit interfaces or narrowly scoped types.
- Validate unknown external input (especially webhooks) at system boundaries before trusting it.

## Framework (Next.js)
- Default to server components.
- Add `use client` only when browser interactivity requires it.
- Keep route handlers focused on a single responsibility.

## Styling
- Use CSS custom property tokens — no hardcoded hex values.
- Use `tabular-nums` for all financial figures.
- Use `components/ui/*` for standard elements (buttons, inputs). Do not modify them directly.

## API Routes & Webhooks
- Validate and parse all incoming request bodies using **Zod** schemas before any business logic runs.
- Verify webhook signatures immediately upon receiving a request.
- Enforce auth and ownership before any mutation.
- Return consistent, predictable response shapes.
- **Idempotency:** Always query the database to check if a `transaction_id` already exists before inserting a new payment. Ignore duplicates gracefully.

## Data and Storage
- Use Prisma ORM for all database queries.
- Metadata and relational data belong in Supabase (PostgreSQL).
- **Atomic Transactions:** When a single action updates multiple tables (e.g., creating a payment record and updating a church status), use `prisma.$transaction` to ensure all changes succeed or fail together.

## File Organisation
- `app/` — routes, layouts, page-level composition.
- `components/` — reusable UI components.
- `lib/` — server helpers, data access, Prisma client, API integrations.
- `prisma/` — schema and migrations.
- `context/` — the six context files and specs.

## Protected Files
- `components/ui/*` — generated component library; never edit manually.
- `lib/prisma.ts` — managed Prisma client.