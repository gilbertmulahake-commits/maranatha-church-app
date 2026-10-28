# Unit 01: Database Initialization

## Goal
Set up the foundational database connection for the Maranatha Church System. Configure Prisma to connect to a Supabase PostgreSQL database and define the core database schema (Regions, Churches, Payments, Regional Scores).

## Design
This is a backend/database unit. No UI changes are needed in this unit.

## Implementation

### Dependencies
- `prisma` (for database schema management)
- `@prisma/client` (for querying the database from Next.js)
- `dotenv` (to load environment variables for Prisma)

### 1. Environment Variables
- Create a `.env` file in the root of the project.
- Add `DATABASE_URL="your-supabase-connection-string"` (I will provide the exact Supabase string).
- Create a `.env.example` file with `DATABASE_URL=""` so other developers know what is needed.

### 2. Prisma Setup
- Initialize Prisma: `npx prisma init`
- Configure `prisma/schema.prisma` to use PostgreSQL.
- Define the following models:

**Region Model:**
- `id` (String, UUID, Primary Key)
- `name` (String, Unique) - e.g., "Northern", "Eastern"
- `chairman_name` (String)
- `contact_phone` (String)
- `created_at` (DateTime, default now())
- `churches` (Relation to Church model)

**Church Model:**
- `id` (String, UUID, Primary Key)
- `church_code` (String, Unique) - e.g., "CH001"
- `church_name` (String)
- `region_id` (String, Foreign Key to Region)
- `treasurer_name` (String)
- `contact_phone` (String)
- `annual_fee` (Decimal, default 5000.00)
- `monthly_fee` (Decimal, default 500.00)
- `created_at` (DateTime, default now())
- `payments` (Relation to Payment model)

**Payment Model:**
- `id` (String, UUID, Primary Key)
- `church_id` (String, Foreign Key to Church)
- `transaction_id` (String, Unique) - The KCB/M-Pesa reference (Invariant: Idempotency)
- `payment_type` (Enum: 'Monthly', 'Annual')
- `amount_paid` (Decimal)
- `payment_date` (DateTime)
- `payment_method` (Enum: 'M-Pesa', 'Bank Transfer', 'Cash')
- `status` (Enum: 'Paid', 'Pending', 'Overdue', default 'Pending')
- `month_covered` (String) - e.g., "January 2026"
- `created_at` (DateTime, default now())

**RegionalScore Model:**
- `id` (String, UUID, Primary Key)
- `region_id` (String, Foreign Key to Region)
- `year` (Int)
- `quarter` (Enum: 'Q1', 'Q2', 'Q3', 'Q4')
- `compliance_pct` (Decimal)
- `timeliness_pct` (Decimal)
- `reporting_accuracy` (Decimal)
- `leadership_engagement` (Decimal)
- `final_score` (Decimal)
- `incentive_tier` (String)

### 3. Migrations
- Run `npx prisma migrate dev --name init` to create the tables in Supabase.

## Verification Checklist
- [ ] `schema.prisma` is populated with the exact models above.
- [ ] `npx prisma migrate dev` runs successfully without errors.
- [ ] You can see the tables (Region, Church, Payment, RegionalScore) in your Supabase dashboard.
- [ ] No TypeScript errors.