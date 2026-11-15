import { Suspense } from 'react'
import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { Loader2 } from 'lucide-react'
import { ForceResetForm } from './force-reset-form'

async function ForceResetContent() {
  await connection()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })

  // No flag → nothing to enforce, go to dashboard
  if (!dbUser || !dbUser.requires_password_reset) {
    redirect('/dashboard')
  }

  return <ForceResetForm email={user.email || ''} />
}

export default function ForcePasswordResetPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <ForceResetContent />
    </Suspense>
  )
}