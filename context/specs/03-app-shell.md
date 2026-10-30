# Unit 03: App Shell & UI Layout

## Goal
Build the visual foundation of the application. Create a professional, enterprise-grade layout with a fixed sidebar navigation (National HQ, Regions, Churches, Payments, Reports, Settings), a sticky topbar with user profile, and a responsive main content area.

## Design
- **Theme:** Reference `ui-context.md`. Use Slate/Navy tokens (`--accent-primary: #0F172A`, `--bg-base: #F8FAFC`).
- **Layout:**
  - **Sidebar:** Fixed left, 240px width. Deep navy background (`#0F172A`). White text. Icons from Lucide React. Contains brand logo at the top and nav links.
  - **Topbar:** Sticky top, white background, bottom border (`#E2E8F0`). Contains a global search bar and a user profile dropdown with "Sign Out".
  - **Main Content:** Scrollable area to the right of the sidebar, below the topbar. Padded `p-6` or `p-8`.
- **Responsiveness:** On mobile (< 768px), the sidebar collapses into a hamburger menu.

## Implementation

### Dependencies
- `lucide-react` (for icons)
- `clsx` and `tailwind-merge` (for conditional class merging)
- `shadcn/ui` (for base components: Button, DropdownMenu)

### 1. Install shadcn/ui
- Run `npx shadcn@latest init` (Choose default style, Slate color, CSS variables).
- Add the necessary components:
  ```cmd
  npx shadcn@latest add button dropdown-menu input
  ```

### 2. Create the Utility
- Create `lib/utils.ts` with the standard `cn` function (clsx + tailwind-merge). *(shadcn usually creates this automatically).*

### 3. Build the App Shell Components
- `components/layout/sidebar.tsx` — The fixed navigation.
- `components/layout/topbar.tsx` — The sticky header with user menu.
- `components/layout/app-shell.tsx` — The wrapper that combines sidebar + topbar + main content.

### 4. Update `app/dashboard/page.tsx`
- Import the `AppShell` component.
- Wrap the placeholder dashboard content inside `AppShell`.
- The page should display "National Dashboard" as the header.

### 5. Sign Out Logic
- In the topbar's user dropdown, add a "Sign Out" button.
- On click, call `supabase.auth.signOut()` and redirect to `/login`.

## Verification Checklist
- [ ] The sidebar is visible on desktop with the correct Navy color.
- [ ] The sidebar collapses on mobile (resize browser window).
- [ ] The topbar is sticky and has a search bar.
- [ ] The user dropdown shows the logged-in email.
- [ ] Clicking "Sign Out" redirects to `/login`.
- [ ] No TypeScript or lint errors.
