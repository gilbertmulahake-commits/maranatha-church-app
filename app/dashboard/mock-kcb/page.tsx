import { Suspense } from 'react'
import { connection } from 'next/server'
import { MockKCBForm } from '@/components/mock-kcb-form'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { Skeleton } from '@/components/ui/skeleton'

async function MockKCBContent() {
  await connection()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let lockedChurchCode: string | null = null
  let userRole = 'UNKNOWN'

  if (user) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { church: true },
    })

    if (dbUser) {
      userRole = dbUser.role
      if (['LOCAL_PASTOR', 'CHURCH_TREASURER'].includes(dbUser.role)) {
        if (dbUser.church) {
          lockedChurchCode = dbUser.church.church_code
        } else {
          console.warn('User is a local role but has no church assigned!')
        }
      }
    }
  }

  return (
    <MockKCBForm userRole={userRole} lockedChurchCode={lockedChurchCode} />
  )
}

export default function MockKCBPage() {
  return (
    <div className="space-y-xl" style={{ width: '100%', maxWidth: '42rem' }}>
      <div>
        <h1 className="text-heading-2 font-medium text-foreground">Mock KCB Simulator</h1>
        <p className="mt-xs text-paragraph-small text-muted-foreground">
          Simulate an incoming M-Pesa payment from KCB to test the reconciliation engine.
        </p>
      </div>

      <Suspense
        fallback={<Skeleton className="h-[560px] rounded-xl" />}
      >
        <MockKCBContent />
      </Suspense>
    </div>
  )
}