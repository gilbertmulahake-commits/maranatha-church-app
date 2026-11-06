import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import { getCurrentUserRole } from '@/lib/actions/auth-actions'

export async function AppShell({ children }: { children: React.ReactNode }) {
  const role = await getCurrentUserRole()

  return (
    <div className="min-h-screen bg-background">
      <Sidebar role={role} />
      <div className="pl-64">
        <Topbar />
        <main className="p-xl">{children}</main>
      </div>
    </div>
  )
}