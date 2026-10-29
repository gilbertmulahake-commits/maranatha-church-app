# Unit 01: Database Initialization

## Goal
Set up the foundational database connection for the Maranatha Church System. Configure Prisma to connect to a Supabase PostgreSQL database and define the core database schema (Regions, Churches, Payments, Regional Scores) with strict adherence to our architecture invariants.

## Design
This is a backend/database unit. No UI changes are needed in this unit. The focus is on data integrity, relationship mapping, and establishing the secure connection to Supabase.

## Implementation

### Dependencies
- `prisma` (for database schema management)
- `@prisma/client` (for querying the database from Next.js)
- `dotenv` (to load environment variables for Prisma)

### 1. Environment Variables
- Create a `.env` file in the root of the project.
- Add `DATABASE_URL="postgresql://postgres.ansvygankikgabhlatvd:[YOUR_PASSWORD]@aws-0-eu-west-1.pooler.supabase.com:6543/postgres"` (Replace with the actual Supabase password).
- Create a `.env.example` file with `DATABASE_URL=""` as a template.

### 2. Prisma Setup
- Initialize Prisma: `npx prisma init`
- Replace the contents of `prisma/schema.prisma` with the exact code below.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// --- MODELS ---

model Region {
  id             String         @id @default(uuid())
  name           String         @unique
  chairman_name  String
  contact_phone  String
  created_at     DateTime       @default(now())
  churches       Church[]
  regionalScores RegionalScore[]
}

model Church {
  id             String    @id @default(uuid())
  church_code    String    @unique // e.g., "CH001"
  church_name    String
  region_id      String
  region         Region    @relation(fields: [region_id], references: [id])
  treasurer_name String
  contact_phone  String
  annual_fee     Decimal   @default(5000.00)
  monthly_fee    Decimal   @default(500.00)
  created_at     DateTime  @default(now())
  payments       Payment[]
}

model Payment {
  id             String   @id @default(uuid())
  church_id      String
  church         Church   @relation(fields: [church_id], references: [id])
  transaction_id String   @unique // KCB/M-Pesa reference code (Invariant: Idempotency)
  payment_type   PaymentType
  amount_paid    Decimal
  payment_date   DateTime
  payment_method PaymentMethod
  status         PaymentStatus @default(Pending)
  month_covered  String?  // e.g., "January 2026"
  created_at     DateTime @default(now())
}

model RegionalScore {
  id                    String   @id @default(uuid())
  region_id             String
  region                Region   @relation(fields: [region_id], references: [id])
  year                  Int
  quarter               String   // Q1, Q2, Q3, Q4
  compliance_pct        Decimal
  timeliness_pct        Decimal
  reporting_accuracy    Decimal
  leadership_engagement Decimal
  final_score           Decimal
  incentive_tier        String
  created_at            DateTime @default(now())
}

// --- ENUMS ---

enum PaymentType {
  Monthly
  Annual
}

enum PaymentMethod {
  M_Pesa
  Bank_Transfer
  Cash
}

enum PaymentStatus {
  Paid
  Pending
  Overdue
}
```

### 2.1 Prisma Version Compatibility (Corrective Action)
- *Issue:* Next.js installed Prisma v8 (Release Candidate) which removed `migrate dev`. The fallback package `@prisma/prisma7` also conflicted with the v8 generated `prisma.config.ts`.
- *Fix:* We installed `@prisma/prisma7` and `@prisma/config`. We removed the `url` from `schema.prisma` and configured it inside `prisma.config.ts` using `env('DATABASE_URL')`.
- *Command:* Migrations must be run using `npx prisma7 migrate dev --name [name]`.

### 3. Migrations
- Run `npx prisma migrate dev --name init` to create the tables in Supabase.

### Files to create / modify
- `.env` — Add the Supabase connection string.
- `.env.example` — Add the empty template.
- `prisma/schema.prisma` — Replace with the schema above.

## Verification Checklist
- [ ] `schema.prisma` is populated with the exact models above.
- [ ] `npx prisma migrate dev` runs successfully without errors.
- [ ] You can see the tables (Region, Church, Payment, RegionalScore) in your Supabase dashboard.
- [ ] No TypeScript errors.
