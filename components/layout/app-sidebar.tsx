'use client'

import {
  Icon,
  IconLayoutDashboard,
  IconMapPin,
  IconBuilding,
  IconCreditCard,
  IconFileText,
  IconUsers,
  IconSettings,
  IconBolt,
  IconBuildingBank,
} from '@tabler/icons-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { NavMain } from './nav-main'
import { NavUser } from './nav-user'
import { Role } from '@prisma/client'
import { isNationalLevel, isRegionalLevel } from '@/lib/auth/roles'

// FIXED: Use Tabler's `Icon` type (matches NavMain's expected prop)
type NavItem = {
  title: string
  url: string
  icon: Icon
}

export function AppSidebar({ role, userEmail }: { role: Role | null; userEmail?: string }) {
  let navMain: NavItem[] = []
  let navSecondary: NavItem[] = []

  // 🛡️ Using centralized RBAC helpers instead of hardcoded string arrays.
  // SYSTEM_ADMIN is included in NATIONAL_ROLES, so it inherits full access.
  if (isNationalLevel(role)) {
    navMain = [
      { title: 'Dashboard', url: '/dashboard', icon: IconLayoutDashboard },
      { title: 'Regions', url: '/dashboard/regions', icon: IconMapPin },
      { title: 'Churches', url: '/dashboard/churches', icon: IconBuilding },
      { title: 'Payments', url: '/dashboard/payments', icon: IconCreditCard },
      { title: 'Users', url: '/dashboard/users', icon: IconUsers },
      { title: 'Reports', url: '/dashboard/reports', icon: IconFileText },
      { title: 'Mock KCB', url: '/dashboard/mock-kcb', icon: IconBolt },
    ]
  } else if (isRegionalLevel(role)) {
    navMain = [
      { title: 'Regional Dashboard', url: '/dashboard/regional', icon: IconLayoutDashboard },
      { title: 'Regional Payments', url: '/dashboard/payments', icon: IconCreditCard },
      { title: 'Reports', url: '/dashboard/reports', icon: IconFileText },
    ]
  } else {
    // Local Church (Pastors & Treasurers)
    navMain = [
      { title: 'Church Dashboard', url: '/dashboard/local', icon: IconLayoutDashboard },
      { title: 'Reports', url: '/dashboard/reports', icon: IconFileText },
    ]
  }

  navSecondary = [{ title: 'Settings', url: '/dashboard/settings', icon: IconSettings }]

  // The NavUser component now requires a role. Default to CHURCH_TREASURER if null.
  const user = {
    name: userEmail?.split('@')[0] || 'User',
    email: userEmail || 'user@maranatha.org',
    avatar: '',
    role: role || 'CHURCH_TREASURER',
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={
                <a href="/dashboard">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <IconBuildingBank className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Maranatha</span>
                    <span className="truncate text-xs">Kenya</span>
                  </div>
                </a>
              }
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={navMain} />
        <NavMain items={navSecondary} label="Settings" />
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}