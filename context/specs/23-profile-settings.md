# Unit 23: Profile Settings

## Goal

Replace the flat `/dashboard/settings` page with a nested route — `/dashboard/settings/profile` — where every authenticated role can view their read-only identity (email, role, region, church) and edit their own personal bio-data (`first_name`, `last_name`, `phone`, `bio`, `profile_photo_url`) against their own `User` row only. On save, the sidebar display name and avatar reflect the change without a hard refresh; identity-field changes are audit-logged; cosmetic fields (bio, photo URL) are not.

## Design

### Route structure

- `app/dashboard/settings/layout.tsx` — shared chrome: `<h1>Settings</h1>`, subtitle, `<SettingsNav />` tab strip, `{children}` inside a `max-w-5xl` content column. Static server component, no data fetch, no `<Suspense>`.
- `app/dashboard/settings/page.tsx` — becomes a pure `redirect('/dashboard/settings/profile')`. Preserves every existing bookmark, email link, and typed URL. Counts as one route in the build.
- `app/dashboard/settings/profile/page.tsx` — the Profile tab content. Server Component under `<Suspense>` with `await connection()` (matching the existing house pattern).

**Page count forecast: 30/30 → 31/31.**

### Tab strip

`<SettingsNav />` is a client component using `usePathname()` for the active state. In Unit 23 it renders a **single** tab — Profile — because the System tab does not exist yet. Unit 23.5 adds the second entry to the same array, no component change. Role-gating of the System tab is deferred to 23.5 (there is nothing to gate in 23); Unit 23's layout stays static and requires no `getCurrentUserRole()` round-trip.

### Profile page layout

Single column, top to bottom, `space-y-xl` between major sections (ui-context § 4):

1. **Personal Information** — full-width editable `<Card>` (create). First name + Last name in a 2-column row on `md+`, Phone full-width, Bio full-width `<Textarea>`, Profile Photo URL full-width with a live `<Avatar>` preview to its right. Submit button right-aligned.
2. **Two-column row** (`grid grid-cols-1 md:grid-cols-2 gap-md items-start`): **Account Details** (existing `<ProfileCard>`, now with a read-only `bio` line) and **Security** (existing `<PasswordForm>`).

This preserves today's side-by-side card layout and adds the editable card above it. Content column `max-w-5xl` (Tailwind standard class, not arbitrary) — matches today's `64rem` intent without the inline style.

### Personal Information form

- **Client component**, `<PersonalInfoForm>`.
- Inputs: `<Input type="text">` for name fields, `<Input type="tel">` for phone, `<Input type="url">` for the photo, `<Textarea>` for bio.
- Inputs `h-9 bg-card border-border` (ui-context § 11). Labels `text-paragraph-small font-medium text-foreground` with `htmlFor` wired. Errors below the field in `text-paragraph-small text-destructive`.
- Avatar preview uses `<Avatar>` / `<AvatarImage>` / `<AvatarFallback>` from the shadcn primitive; `AvatarFallback` initials render when the URL is empty or fails to load. This is the standard shadcn behaviour, not a custom guard.
- **Dirty-state tracking:** Save button `disabled` when no field has changed since mount. `beforeunload` guard on the browser while dirty.
- **Save:** builds `FormData`, calls `updateUserProfile(formData)`, on success shows Sonner success toast, resets dirty state, calls `router.refresh()` (so the sidebar name/avatar updates immediately, not on next navigation). On error shows Sonner error toast, keeps the form filled.
- **No `<Dialog>`, no `<AlertDialog>`** — no destructive action, no confirmation step.
- **No `<Select>`, no `<KpiGrid>`, no `<TableShell>`, no `<TableToolbar>`** — settings is neither a dashboard nor a table. Applying those mandates here by habit would be cargo-culting the design system.

### Read-only Account Details card

Preserve `<ProfileCard>` as-is, plus one addition: render `profile.bio` as a paragraph at the bottom of `<CardContent>` when non-null. Rationale — bio is editable in the form above; if no surface renders it, the user edits a field that produces no visible effect anywhere. This closes that loop with ~5 lines and no new component.

### Security card

Preserve `<PasswordForm>` byte-identical except for three attribute additions per `code-standards.md` § "Known ESLint Gaps" and `ui-context.md` § 12 (every input must have an associated label):

- `<Input id="new-password" autoComplete="new-password" ...>` and `<label htmlFor="new-password">`
- `<Input id="confirm-password" autoComplete="new-password" ...>` and `<label htmlFor="confirm-password">`

Pre-existing a11y defect; fixed in-session per `ai-workflow-rules.md` § "Never Defer Bugs or Fixes."

### Sidebar identity propagation

`<AppSidebar>` today derives its display name from `userEmail.split('@')[0]` and hardcodes `avatar: ''`. It will accept three new props — `firstName`, `lastName`, `avatarUrl` — and compute:

```
name = [firstName, lastName].filter(Boolean).join(' ')
       || userEmail.split('@')[0]
       || 'User'
avatar = avatarUrl ?? ''
```

The dashboard layout already loads the full `User` row for lifecycle checks (`is_active`, `requires_password_reset`) — `first_name`, `last_name`, `profile_photo_url` are in memory. Zero new DB queries.

Sidebar "Settings" nav item URL changes from `/dashboard/settings` to `/dashboard/settings/profile` — direct link, no redirect hop on the primary nav.

### What this unit deliberately does NOT do

- No schema change. No migration. No `prisma/schema.prisma` edit.
- No new guard in `lib/auth/guards.ts`. Self-scope is enforced by construction (see Implementation § 6).
- No `PROTECTED_USER_IDS` check — self-editing your own row is not a cross-user mutation. A SYSTEM_ADMIN can edit their own `first_name`, `last_name`, `phone`, `bio`, `profile_photo_url` without any protected-account rejection. This is stated explicitly so a future reader does not "add the protected check for safety" and accidentally lock a SYSTEM_ADMIN out of editing their own name.
- No email change. Supabase Auth requires a re-verification round-trip that does not exist yet. Logged as Open Question.
- No avatar upload. URL-only, consistent with `architecture.md` § 3 ("No Blob Storage Needed"). Logged as Open Question.
- No cross-user profile editing. Every role edits their own row only.
- No changes to `components/ui/*`, `lib/utils.ts`, `prisma/migrations/*`.
- No `<KpiGrid>`, `<TableShell>`, `<TableToolbar>`, `<Select>`, `<Dialog>`, `<AlertDialog>`.
- No photo field. `User.profile_photo_url` remains nullable and dormant. Full Supabase Storage upload (file picker, MIME/size validation, `avatars/{userId}/*` bucket with RLS, replace-on-new) ships in Unit 23.6. The URL-only field originally scoped here was rejected at implementation time as non-enterprise-grade — a URL field no non-technical user can populate is not a real feature.

## Implementation

### Dependencies

None. No new packages.

### 1. Route structure

Create `/dashboard/settings/profile` as the Profile tab. The existing `/dashboard/settings` remains as a redirect route, preserving old bookmarks. A shared `app/dashboard/settings/layout.tsx` owns the page title, subtitle, and tab strip.

### 2. `app/dashboard/settings/layout.tsx` (create)

Server component. No `await connection()`, no `<Suspense>`, no data fetch.

Renders:
- `<h1 className="text-heading-2 font-bold text-foreground">Settings</h1>`
- Subtitle `<p className="mt-xs text-paragraph-small text-muted-foreground">Manage your personal profile and system security.</p>`
- `<SettingsNav items={[{ label: 'Profile', href: '/dashboard/settings/profile' }]} />`
- `<div className="max-w-5xl">{children}</div>`

Outer wrapper `space-y-xl` (ui-context § 4). No inline `style={{ maxWidth: ... }}` — the arbitrary 64rem inline style on today's page is removed.

### 3. `components/settings/settings-nav.tsx` (create)

Client component (`'use client'`).

Props: `items: { label: string; href: string }[]`.

Renders a horizontal tab strip using semantic tokens only (`border-border`, `bg-card`, `text-foreground` / `text-muted-foreground`). Active tab derived from `usePathname() === item.href`. Each tab is a `<Link>`; active tab carries `border-b-2 border-primary text-foreground`, inactive `text-muted-foreground hover:text-foreground transition-colors`.

No dropdown. No `<Select>`.

### 4. `app/dashboard/settings/profile/page.tsx` (create)

Server Component, matches the existing `settings/page.tsx` house pattern:

- `export default function ProfilePage()` wraps `<Suspense>` with a skeleton matching the three-card layout (one full-width, two side-by-side) — no arbitrary `h-[400px]`, use realistic card heights per ui-context § 10 "Loading States".
- Inner async `ProfileContent()` calls `await connection()`, `getCurrentUserProfile()`, `redirect('/login')` on null.
- Renders `<div className="space-y-xl">` containing `<PersonalInfoForm profile={profile} />` then `<div className="grid grid-cols-1 md:grid-cols-2 gap-md items-start"><ProfileCard profile={profile} /><PasswordForm /></div>`.

### 5. `app/dashboard/settings/page.tsx` (modify)

Replace entire body with:

```tsx
import { redirect } from 'next/navigation'

export default function SettingsRedirect() {
  redirect('/dashboard/settings/profile')
}
```

No `<Suspense>`, no `<h1>`, no data fetch.

### 6. `lib/actions/user-actions.ts` (modify)

**(a) Extend `UserProfile`:**

```ts
export type UserProfile = {
  id: string
  email: string
  role: Role
  first_name: string | null
  last_name: string | null
  phone: string | null
  bio: string | null                 // NEW
  profile_photo_url: string | null   // NEW
  regionName: string | null
  churchName: string | null
}
```

`getCurrentUserProfile()` maps the two new fields. Verified by reading the file: `getCurrentUserProfile()` is the **only** producer of `UserProfile`, so no second site needs updating (unlike `LocalChurchStats` / `RegionalChurchData`).

**(b) Add `updateUserProfile(formData: FormData)`:**

Follows the `clearPasswordResetFlag` / `updatePasswordAndClearFlag` house style in this same file — session-derived actor ID, self-scoped, **no guard wrapper**. Signature is `(formData: FormData)` with **no user id argument**; the target is always `session.user.id`. Self-scope is enforced by construction — accepting an id would invite a caller to pass another user's id, requiring a guard, which is the pattern we are deliberately not introducing.

Zod schema validates and normalises:

```ts
const ProfileSchema = z.object({
  first_name: z.string().trim().max(80).transform(v => v === '' ? null : v),
  last_name:  z.string().trim().max(80).transform(v => v === '' ? null : v),
  phone:      z.string().trim().max(20).transform(v => v === '' ? null : v),
  bio:        z.string().trim().max(500).transform(v => v === '' ? null : v),
  profile_photo_url: z.union([
    z.literal(''),
    z.string().trim().url().max(500),
  ]).transform(v => v === '' ? null : v),
})
```

Behaviour:

1. Read session user; return `{ error: 'Unauthorized' }` if null.
2. Parse `formData` through `ProfileSchema`; on Zod error return `{ error: <first issue message> }`.
3. Load `beforeUser = prisma.user.findUnique({ where: { id: sessionUserId } })`.
4. `prisma.user.update({ where: { id: sessionUserId }, data: { ...parsed } })`.
5. `await logAudit({ action: 'USER_PROFILE_UPDATED', entity: 'User', entityId: sessionUserId, beforeData: { first_name, last_name, phone }, afterData: { first_name, last_name, phone } })` — **identity fields only**. `bio` and `profile_photo_url` are cosmetic and are not recorded. If a future unit adds cross-user editing of another user's photo, that action audits — this action does not.
6. `revalidatePath('/dashboard', 'layout')` and `revalidatePath('/dashboard/settings/profile')`.
7. Return `{ success: true }`.

Catch block returns `{ error: <message> }`, matching the file's existing pattern.

**No `PROTECTED_USER_IDS` check.** The action is self-scoped; a SYSTEM_ADMIN editing their own row is the actor and the subject, not "another user modifying a protected account."

### 7. `components/settings/personal-info-form.tsx` (create)

Client component (`'use client'`).

Props: `profile: UserProfile`.

State:

- `useState` for each of the 5 fields, initialised from `profile`.
- `isDirty` derived from comparing state to `profile` (or a boolean set on each change; either is acceptable — the spec requires *a* dirty flag).
- `isSaving` boolean.
- `useEffect` attaches and removes a `beforeunload` listener when dirty. Do **not** call `setState` inside the effect body — per `code-standards.md` § "Known ESLint Gaps: `react-hooks/set-state-in-effect`."

Submit handler:

```ts
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  setSaving(true)
  const fd = new FormData()
  // append the 5 fields
  const result = await updateUserProfile(fd)
  setSaving(false)
  if ('error' in result) {
    toast.error(result.error)
    return
  }
  toast.success('Profile updated')
  router.refresh()
}
```

Layout of fields:

- First name / Last name: `grid grid-cols-1 md:grid-cols-2 gap-md`
- Phone: full width, `<Input type="tel">`
- Bio: full width, `<Textarea onChange={(e: ChangeEvent<HTMLTextAreaElement>) => ...}>` — per `code-standards.md` § "`<Textarea>` Component"
- Profile Photo URL: full width `<Input type="url">` with `<Avatar>` preview to the right of the input (flex row on `md+`, stack on mobile)
- Save button: `flex justify-end pt-4` wrapper, `<Button type="submit" disabled={!isDirty || isSaving}>`, shows `<Loader2>` spinner when saving

No `<Dialog>`. No `<AlertDialog>`. No `<Select>`.

### 8. `components/settings/profile-card.tsx` (modify)

Add one conditional at the bottom of `<CardContent>`:

```tsx
{profile.bio && (
  <div>
    <p className="text-paragraph-small font-medium text-foreground">Bio</p>
    <p className="text-paragraph-small text-muted-foreground whitespace-pre-wrap break-words">
      {profile.bio}
    </p>
  </div>
)}
```

Everything else unchanged. Do not restyle the card. The pre-existing `space-y-6` inside `<CardContent>` is not in Unit 23's scope to change.

### 9. `components/settings/password-form.tsx` (modify)

Three attribute additions on each of the two inputs:

```tsx
<label htmlFor="new-password" ...>
<Input id="new-password" autoComplete="new-password" ...>

<label htmlFor="confirm-password" ...>
<Input id="confirm-password" autoComplete="new-password" ...>
```

Everything else byte-identical. Rationale: `ui-context.md` § 12 ("Every input must have an associated `<label>`") and password-manager compatibility. Pre-existing defect; fixed in-session.

### 10. `components/layout/nav-user.tsx` (modify)

Change:

```tsx
onClick={() => router.push('/dashboard/settings')}
```

to:

```tsx
onClick={() => router.push('/dashboard/settings/profile')}
```

No other changes.

### 11. `components/layout/app-sidebar.tsx` (modify)

Extend props type:

```ts
export function AppSidebar({
  role,
  userEmail,
  firstName,
  lastName,
  avatarUrl,
  unresolvedCount = 0,
  pendingDeletionCount = 0,
}: {
  role: Role | null
  userEmail?: string
  firstName?: string | null
  lastName?: string | null
  avatarUrl?: string | null
  unresolvedCount?: number
  pendingDeletionCount?: number
}) {
```

Replace the `user` object:

```ts
const user = {
  name: [firstName, lastName].filter(Boolean).join(' ')
    || userEmail?.split('@')[0]
    || 'User',
  email: userEmail || 'user@maranatha.org',
  avatar: avatarUrl ?? '',
  role: role || 'CHURCH_TREASURER',
}
```

Change the Settings nav item URL:

```ts
navSecondary = [
  { title: 'Settings', url: '/dashboard/settings/profile', icon: IconSettings },
  { title: 'Help', url: '/dashboard/help', icon: IconHelp },
]
```

No other changes.

### 12. `app/dashboard/layout.tsx` (modify)

Pass the three new props from the existing `dbUser`:

```tsx
<AppSidebar
  role={role}
  userEmail={user.email}
  firstName={dbUser?.first_name ?? null}
  lastName={dbUser?.last_name ?? null}
  avatarUrl={dbUser?.profile_photo_url ?? null}
  unresolvedCount={unresolvedCount}
  pendingDeletionCount={pendingDeletionCount}
/>
```

Zero new DB queries — `dbUser` is already loaded for lifecycle checks.

### Files to create / modify

| Path | Action | Reason |
|---|---|---|
| `app/dashboard/settings/layout.tsx` | create | Shared chrome; title, subtitle, tab strip |
| `app/dashboard/settings/profile/page.tsx` | create | Profile tab content |
| `components/settings/settings-nav.tsx` | create | Client tab strip, `usePathname` active state |
| `components/settings/personal-info-form.tsx` | create | Editable form |
| `app/dashboard/settings/page.tsx` | modify | Replace with `redirect('/dashboard/settings/profile')` |
| `lib/actions/user-actions.ts` | modify | Extend `UserProfile`; add `bio`, `profile_photo_url`; add `updateUserProfile` action |
| `components/settings/profile-card.tsx` | modify | Add conditional bio paragraph |
| `components/settings/password-form.tsx` | modify | Add `id` / `htmlFor` / `autoComplete` (a11y) |
| `components/layout/nav-user.tsx` | modify | "My Profile" links to `/dashboard/settings/profile` |
| `components/layout/app-sidebar.tsx` | modify | New props; name/avatar derivation; Settings URL |
| `app/dashboard/layout.tsx` | modify | Pass `firstName` / `lastName` / `avatarUrl` to `<AppSidebar>` |

**Observed, not fixed** (recorded for a future cleanup unit):

- `formatRole()` is duplicated in `nav-user.tsx` and `profile-card.tsx` — 2 files, under the 3+ threshold in `code-standards.md` § "Component Reuse."
- `user-actions.ts` has a local `verifyOperationsAdmin()` helper instead of importing from `lib/auth/guards.ts` — pre-existing pattern split.
- `app/dashboard/layout.tsx` calls both `prisma.user.findUnique()` and `getCurrentUserRole()` — the second re-reads the row the first already loaded. One-row redundancy, not a bug.
- `components/settings/profile-card.tsx` uses `space-y-6` where ui-context § 4 would prefer `space-y-xl`. Not restyled because the file is preserved; a future polish pass can address it.

## Verification Checklist

- [ ] `GET /dashboard/settings` returns a 307 redirect to `/dashboard/settings/profile`
- [ ] `GET /dashboard/settings/profile` renders for every role (System Admin, Finance Admin, Operations Admin, National Treasurer, National Overseer, Regional Chairman, Regional Treasurer, Local Pastor, Church Treasurer)
- [ ] Sidebar "Settings" nav item points to `/dashboard/settings/profile` and reaches the page in one hop
- [ ] "My Profile" in the nav-user dropdown points to `/dashboard/settings/profile`
- [ ] Personal Information form renders all five fields with existing values (or empty for nulls)
- [ ] Editing `first_name` and clicking Save persists to the `User` row and shows a success toast
- [ ] After Save, the sidebar display name updates without a hard refresh
- [ ] Editing `profile_photo_url` to a valid URL renders the avatar in the form preview, the sidebar, and the nav-user dropdown
- [ ] Editing `profile_photo_url` to an invalid URL is rejected server-side with a toast; the field keeps the user's input
- [ ] Editing `bio` persists; the Account Details card renders it as a paragraph beneath the existing fields
- [ ] Editing `bio` or `profile_photo_url` alone creates **no** `AuditLog` entry
- [ ] Editing `first_name`, `last_name`, or `phone` creates exactly one `USER_PROFILE_UPDATED` entry with `before_data` / `after_data` restricted to those three fields
- [ ] A SYSTEM_ADMIN (protected account) can save their own profile; no `Forbidden` error is returned
- [ ] Save button is disabled when no field has changed
- [ ] Closing the browser tab while the form is dirty triggers the `beforeunload` prompt
- [ ] Password form still updates the password successfully and shows its success toast
- [ ] Password form inputs are associated with their labels (`id` / `htmlFor`) and carry `autoComplete="new-password"`
- [ ] Editing a second user's profile is impossible — the action signature accepts no user id; the target is always `session.user.id`
- [ ] No new `AuditLog.action` value is emitted other than `USER_PROFILE_UPDATED`
- [ ] No protected files touched (`components/ui/*`, `lib/utils.ts`, `prisma/migrations/*`)
- [ ] No Prisma schema change; no migration added
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] No lint errors (`npm run lint`)
- [ ] `npm run build` passes with expected page count **31/31**
- [ ] Invariants in `context/architecture.md` hold
