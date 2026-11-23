import { SettingsNav } from '@/components/settings/settings-nav'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-xl">
      <div>
        <h1 className="text-heading-2 font-bold text-foreground">Settings</h1>
        <p className="mt-xs text-paragraph-small text-muted-foreground">
          Manage your personal profile and system security.
        </p>
      </div>

      <SettingsNav items={[{ label: 'Profile', href: '/dashboard/settings/profile' }]} />

      <div className="max-w-5xl">{children}</div>
    </div>
  )
}