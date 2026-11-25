import { connection } from 'next/server'
import { getCurrentUserRole } from '@/lib/actions/auth-actions'
import { isNationalLevel } from '@/lib/auth/roles'
import { SettingsNav } from '@/components/settings/settings-nav'

// Unit 23.5: this layout reads the session role via getCurrentUserRole(), which
// requires connection(). A layout cannot be wrapped in <Suspense> by its pages,
// so opt this segment out of Instant Navigation prerendering.
// Precedent: /dashboard/reports/[report] (Unit 18.2.2b).
export const instant = false

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await connection()
  const role = await getCurrentUserRole()

  const navItems = [{ label: 'Profile', href: '/dashboard/settings/profile' }]

  if (isNationalLevel(role)) {
    navItems.push({ label: 'System', href: '/dashboard/settings/system' })
  }

  return (
    <div className="@container space-y-xl" style={{ width: '100%', maxWidth: '64rem' }}>
      <div>
        <h1 className="text-heading-2 font-bold text-foreground">Settings</h1>
        <p className="mt-xs text-paragraph-small text-muted-foreground">
          Manage your personal profile and security, and view system configuration.
        </p>
      </div>

      <SettingsNav items={navItems} />

      <div>{children}</div>
    </div>
  )
}