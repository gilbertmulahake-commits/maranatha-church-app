'use client'

import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export function SiteHeader() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  return (
    <header className="sticky top-0 z-30 flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-background">
      <div className="flex w-full items-center gap-2 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 h-4" />
        
        <nav className="flex items-center gap-1.5 text-paragraph-small">
          <Link
            href="/dashboard"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Dashboard
          </Link>
          
          {segments.slice(1).map((segment, index) => {
            const isLast = index === segments.length - 2
            // Capitalize and replace dashes with spaces for regions
            const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')
            const href = '/' + segments.slice(0, index + 2).join('/')

            return (
              <span key={segment} className="flex items-center gap-1.5">
                <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
                {isLast ? (
                  <span className="font-medium text-foreground">{label}</span>
                ) : (
                  <Link
                    href={href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {label}
                  </Link>
                )}
              </span>
            )
          })}
        </nav>
      </div>
    </header>
  )
}