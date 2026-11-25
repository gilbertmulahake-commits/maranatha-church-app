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
  IconHistory,
  IconScale,
  IconTrash,
  IconHelp,
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
import { isNationalLevel, isRegionalLevel, isFinanceAdmin, isOperationsAdmin, isNationalTreasurer } from '@/lib/auth/roles'

type NavItem = {
  title: string
  url: string
  icon: Icon
  badge?: number
}

export function AppSidebar({
  role,
  userEmail,
  firstName,
  lastName,
  unresolvedCount = 0,
  pendingDeletionCount = 0,
}: {
  role: Role | null
  userEmail?: string
  firstName?: string | null
  lastName?: string | null
  unresolvedCount?: number
  pendingDeletionCount?: number
}) {
  let navMain: NavItem[] = []
  let navSecondary: NavItem[] = []

  if (isNationalLevel(role)) {
    const nationalNav: NavItem[] = [
      { title: 'Dashboard', url: '/dashboard', icon: IconLayoutDashboard },
      { title: 'Regions', url: '/dashboard/regions', icon: IconMapPin },
      { title: 'Churches', url: '/dashboard/churches', icon: IconBuilding },
      { title: 'Payments', url: '/dashboard/payments', icon: IconCreditCard },
    ]

    // Deletion Requests — Operations Admin, System Admin, National Treasurer
    if (isOperationsAdmin(role) || isNationalTreasurer(role)) {
      nationalNav.push({
        title: 'Deletion Requests',
        url: '/dashboard/church-deletion-requests',
        icon: IconTrash,
        badge: pendingDeletionCount > 0 ? pendingDeletionCount : undefined,
      })
    }

    // Users — Operations Admin and System Admin only
    if (isOperationsAdmin(role)) {
      nationalNav.push({ title: 'Users', url: '/dashboard/users', icon: IconUsers })
    }

    nationalNav.push({ title: 'Reports', url: '/dashboard/reports', icon: IconFileText })

    // Reconciliation — Finance Admin, Treasurer, System Admin
    if (isFinanceAdmin(role) || isNationalTreasurer(role)) {
      nationalNav.push({
        title: 'Reconciliation',
        url: '/dashboard/reconciliation',
        icon: IconScale,
        badge: unresolvedCount,
      })
    }

    nationalNav.push({ title: 'Audit Logs', url: '/dashboard/audit-logs', icon: IconHistory })

    // Mock KCB — Finance Admin and System Admin only
    if (isFinanceAdmin(role)) {
      nationalNav.push({ title: 'Mock KCB', url: '/dashboard/mock-kcb', icon: IconBolt })
    }

    navMain = nationalNav
  } else if (isRegionalLevel(role)) {
    navMain = [
      { title: 'Regional Dashboard', url: '/dashboard/regional', icon: IconLayoutDashboard },
      { title: 'Regional Payments', url: '/dashboard/payments', icon: IconCreditCard },
      { title: 'Reports', url: '/dashboard/reports', icon: IconFileText },
    ]
  } else {
    navMain = [
      { title: 'Church Dashboard', url: '/dashboard/local', icon: IconLayoutDashboard },
      { title: 'Reports', url: '/dashboard/reports', icon: IconFileText },
    ]
  }

  navSecondary = [
    { title: 'Settings', url: '/dashboard/settings/profile', icon: IconSettings },
    { title: 'Help', url: '/dashboard/help', icon: IconHelp },
  ]

  const displayName = [firstName, lastName].filter(Boolean).join(' ')
  const user = {
    name: displayName || userEmail?.split('@')[0] || 'User',
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