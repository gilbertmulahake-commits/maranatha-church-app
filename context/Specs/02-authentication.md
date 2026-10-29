# Unit 02: Authentication & Access Control

## Goal
Implement a secure authentication system using Supabase Auth. Create a login page for all users (National HQ, Regional Chairmen, Church Treasurers) and establish the logic to ensure users are routed to the correct dashboard based on their role. Enforce strict role-based access control (RBAC).

## Design
- **UI:** A clean, professional login page. The design should feel trustworthy and institutional (Navy blue accents, clean white background). It should feature the Maranatha Faith Assemblies Kenya logo/name, an email input, a password input, and a "Sign In" button.
- **UX:** If a user is not logged in and tries to access a protected route, they are redirected to the login page. If a logged-in user tries to access a page outside their role (e.g., a Church Treasurer trying to access the National Dashboard), they see a "403 Unauthorized" message or are redirected to their appropriate dashboard.

## Implementation

### Dependencies
- `@supabase/supabase-js` (The core Supabase library)
- `@supabase/ssr` (The package for handling Supabase Auth in Next.js Server Components and Middleware)
- `zod` (For validating the login form inputs)

### 1. Database Updates (Prisma)
We need a `User` model to link Supabase Auth users to our application roles and organizational hierarchy.
- Add this model to `prisma/schema.prisma`:
```prisma
model User {
  id             String   @id @default(uuid()) // Matches Supabase Auth User ID
  email          String   @unique
  role           Role     @default(CHURCH_TREASURER)
  region_id      String?  // Null for National HQ
  church_id      String?  // Null for National HQ and Region
  created_at     DateTime @default(now())
  
  region         Region?  @relation(fields: [region_id], references: [id])
  church         Church?  @relation(fields: [church_id], references: [id])
}

enum Role {
  NATIONAL_HQ
  REGIONAL_CHAIRMAN
  CHURCH_TREASURER
}
```
*(Note: You must also add `users User[]` to the `Region` and `Church` models to establish the relation).*
- Run `npx prisma7 migrate dev --name add_user_model`.

### 2. Supabase Client Setup
Create two utility files in a new `lib/supabase/` folder:
- `client.ts`: For client-side components (`createBrowserClient`).
- `server.ts`: For server-side components and API routes (`createServerClient`).

### 3. Middleware for Route Protection
Create a `middleware.ts` file in the root of the project (or `src/` if using src directory).
- Use `@supabase/ssr` to refresh the session.
- Protect all routes except `/login`, `/signup` (if enabled), and static assets.
- If a user is not authenticated, redirect to `/login`.

### 4. Login Page
- Create `app/login/page.tsx`.
- Build a form with Email and Password fields.
- On submit, call `supabase.auth.signInWithPassword()`.
- On success, redirect the user to `/dashboard` (we will build role-based redirection logic in the next unit, but for now, just ensure they can log in).
- Display error messages for invalid credentials.

### 5. Role-Based Access Control (RLS Policies)
- Write SQL migrations to enable Row Level Security on all tables (`Region`, `Church`, `Payment`, `RegionalScore`).
- **Policy for Regional Chairman:** Can only `SELECT` rows where `region_id` matches their `region_id` in the `User` table.
- **Policy for Church Treasurer:** Can only `SELECT` rows where `church_id` matches their `church_id` in the `User` table.
- **Policy for National HQ:** Can `SELECT` all rows.

### Files to create / modify
- `prisma/schema.prisma` — Add User model and enums.
- `lib/supabase/client.ts` — Supabase browser client.
- `lib/supabase/server.ts` — Supabase server client.
- `middleware.ts` — Route protection.
- `app/login/page.tsx` — Login UI.
- `context/progress-tracker.md` — Update status.

## Verification Checklist
- [ ] The `User` table exists in Supabase.
- [ ] A user can be created (via Supabase dashboard for now) and can log in.
- [ ] Visiting `/dashboard` without logging in redirects to `/login`.
- [ ] RLS policies are active: A simulated Regional Chairman cannot fetch data from another region.
- [ ] No TypeScript errors.
- [ ] `npm run build` passes.

### Implementation Notes (Corrective Actions)
- **Next.js 16 Update:** The `middleware.ts` convention was deprecated in favor of `proxy.ts`. The file was renamed and the exported function was changed to `proxy`.
- **RLS Type Casting:** Prisma creates `id` columns as `TEXT`. Supabase's `auth.uid()` returns `UUID`. All RLS policies required explicit casting (`id::uuid`) to avoid operator errors.