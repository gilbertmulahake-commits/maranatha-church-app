'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  MapPin,
  Church,
  CreditCard,
  FileText,
  Settings,
  Zap,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Role = 'NATIONAL_TREASURER' | 'NATIONAL_OVERSEER' | 'REGIONAL_CHAIRMAN' | 'REGIONAL_TREASURER' | 'LOCAL_PASTOR' | 'CHURCH_TREASURER' | null

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname()

  // 1. Settings is always available
  const baseItems = [
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ]

  let roleSpecificItems: any[] = []

  if (role === 'NATIONAL_TREASURER' || role === 'NATIONAL_OVERSEER') {
    roleSpecificItems = [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Regions', href: '/dashboard/regions', icon: MapPin },
      { name: 'Churches', href: '/dashboard/churches', icon: Church },
      { name: 'Payments', href: '/dashboard/payments', icon: CreditCard },
      { name: 'Users', href: '/dashboard/users', icon: Users },
      { name: 'Mock KCB', href: '/dashboard/mock-kcb', icon: Zap },
      { name: 'Reports', href: '/dashboard/reports', icon: FileText },
    ]
  } else if (role === 'REGIONAL_CHAIRMAN' || role === 'REGIONAL_TREASURER') {
    roleSpecificItems = [
      { name: 'Dashboard', href: '/dashboard/regional', icon: LayoutDashboard },
      { name: 'Reports', href: '/dashboard/reports', icon: FileText },
    ]
  } else if (role === 'LOCAL_PASTOR' || role === 'CHURCH_TREASURER') {
    // Local roles only get their dashboard and settings (No Reports tab)
    roleSpecificItems = [
      { name: 'Church Dashboard', href: '/dashboard/local', icon: LayoutDashboard },
    ]
  }

  const navItems = [...roleSpecificItems, ...baseItems]

  return (
    <aside className="flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground fixed left-0 top-0 z-40 border-r border-sidebar-border">
      {/* Brand */}
      <div className="flex h-16 items-center border-b border-sidebar-border px-xl">
        <h1 className="text-heading-4 font-medium tracking-tight">
          Maranatha <span className="text-primary-foreground/70">Kenya</span>
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-xs px-sm py-md">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-sm rounded-md px-md py-sm text-paragraph-small font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-md">
        <p className="text-paragraph-mini text-sidebar-foreground/50">
          &copy; 2026 Maranatha Faith Assemblies
        </p>
      </div>
    </aside>
  )
}