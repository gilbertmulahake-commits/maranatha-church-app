'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

type NavItem = {
  label: string
  href: string
}

export function SettingsNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname()

  return (
    <nav className="flex gap-6 border-b border-border" aria-label="Settings sections">
      {items.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'inline-flex items-center pb-3 -mb-px text-paragraph-small font-medium border-b-2 transition-colors',
              isActive
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}