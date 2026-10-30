# Unit 04: Church Management (CRUD)

## Goal
Build the administrative interface to manage the 1,600 churches and 60 regions. Implement a searchable, paginated data table (using TanStack Table) that fetches real data from Supabase via Next.js Server Components. Include a form to add new churches and regions.

## Design
- **Layout:** Uses the existing `AppShell` layout.
- **Regions Page (`/dashboard/regions`):** A simple grid of cards showing each region's name, chairman, and contact. A button to "Add Region".
- **Churches Page (`/dashboard/churches`):** A data table showing Church Code, Name, Region, Treasurer, and Contact. 
- **Table Features:** Global search bar, column sorting, and pagination (20 rows per page).
- **Visuals:** Follow `ui-context.md`. Use `tabular-nums` for Church IDs. Use status badges where applicable.

## Implementation

### Dependencies
- `@tanstack/react-table` (for the data grid logic)
- `react-hook-form` and `@hookform/resolvers` (for the Add Church/Region forms)
- `zod` (for form validation)

### 1. Server Actions / API Routes
- **Action: `getChurches`** — A Next.js Server Action that fetches all churches from Prisma, including their associated region. *Note: Must respect RLS (only fetch what the user is allowed to see).*
- **Action: `createChurch`** — A Server Action that validates input with Zod and creates a new church.
- **Action: `getRegions`** — Fetch all regions.
- **Action: `createRegion`** — Create a new region.

### 2. Regions Page
- Build `app/dashboard/regions/page.tsx` as a Server Component.
- Fetch regions directly using Prisma.
- Display them in a responsive grid.
- Create a `components/regions/create-region-dialog.tsx` that opens a modal form to add a new region.

### 3. Churches Page (Data Table)
- Build `app/dashboard/churches/page.tsx` as a Server Component.
- Pass the fetched church data to a Client Component `components/churches/church-table.tsx`.
- Configure TanStack Table with:
  - Columns: `church_code`, `church_name`, `region.name`, `treasurer_name`, `contact_phone`.
  - Global filter (search bar).
  - Pagination.
- Create a `components/churches/create-church-dialog.tsx` form (Church Code, Name, Region Dropdown, Treasurer Name, Contact).

### 4. Sidebar Navigation
- Ensure the links in `components/layout/sidebar.tsx` correctly point to `/dashboard/regions` and `/dashboard/churches`.

## Verification Checklist
- [ ] Navigating to `/dashboard/regions` shows a list of regions (empty initially).
- [ ] I can create a new region using the dialog, and it appears in the list instantly.
- [ ] Navigating to `/dashboard/churches` shows an empty data table.
- [ ] I can create a new church and select a region from the dropdown.
- [ ] The data table supports searching, sorting, and pagination.
- [ ] No TypeScript or lint errors.