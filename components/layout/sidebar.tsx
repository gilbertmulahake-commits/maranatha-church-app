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
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Regions', href: '/dashboard/regions', icon: MapPin },
  { name: 'Churches', href: '/dashboard/churches', icon: Church },
  { name: 'Payments', href: '/dashboard/payments', icon: CreditCard },
  { name: 'Reports', href: '/dashboard/reports', icon: FileText },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-screen w-64 flex-col bg-[#0F172A] text-white fixed left-0 top-0 z-40">
      {/* Brand */}
      <div className="flex h-16 items-center border-b border-[#1E293B] px-6">
        <h1 className="text-lg font-bold tracking-tight">
          Maranatha <span className="text-[#2563EB]">Kenya</span>
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[#2563EB] text-white'
                  : 'text-[#94A3B8] hover:bg-[#1E293B] hover:text-white'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-[#1E293B] p-4">
        <p className="text-xs text-[#64748B]">
          &copy; 2026 Maranatha Faith Assemblies
        </p>
      </div>
    </aside>
  )
}