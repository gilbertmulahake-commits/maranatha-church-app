'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, LogOut, User, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export function Topbar() {
  const supabase = createClient()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleSignOut = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      await supabase.auth.signOut()
      window.location.replace('/login')
    } catch (error) {
      console.error('Logout failed:', error)
      setIsLoggingOut(false)
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background px-xl">
      {/* Search Bar */}
      <div className="flex flex-1 items-center gap-md">
        <div 
          className="relative w-full"
          style={{ maxWidth: '28rem' }}
        >
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search churches, regions, or payments..."
            className="pl-10 bg-card border-border h-9 text-sm"
          />
        </div>
      </div>

      {/* User Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger render={
          <Button variant="ghost" className="relative h-9 w-9 rounded-full" disabled={isLoggingOut}>
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary text-primary-foreground">
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
          </Button>
        }>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-sm">My Account</DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={handleSignOut} 
            disabled={isLoggingOut}
            className="text-destructive cursor-pointer text-sm"
          >
            {isLoggingOut ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="mr-2 h-4 w-4" />
            )}
            {isLoggingOut ? 'Signing out...' : 'Sign Out'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}