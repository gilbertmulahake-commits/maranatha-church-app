'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { type Icon } from '@tabler/icons-react'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

export function NavMain({
  items,
  label,
}: {
  items: {
    title: string
    url: string
    icon?: Icon
    badge?: number
  }[]
  label?: string
}) {
  const pathname = usePathname()

  return (
    <SidebarGroup>
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarMenu>
        {items.map((item) => {
          const isActive = pathname === item.url
          const showBadge = item.badge !== undefined && item.badge > 0

          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                tooltip={item.title}
                isActive={isActive}
                render={
                  <Link href={item.url}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    {showBadge && (
                      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-bold text-destructive-foreground tabular-nums">
                        {item.badge! > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </Link>
                }
              />
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}