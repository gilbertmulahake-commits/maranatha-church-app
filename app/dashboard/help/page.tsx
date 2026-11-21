// app/dashboard/help/page.tsx

/**
 * Unit 20 — In-App Help & Onboarding.
 *
 * Server component. Renders every tier's help content, current tier first.
 * No RBAC guard of its own — inherits the auth gate (is_active,
 * requires_password_reset, role resolution) from app/dashboard/layout.tsx,
 * and route protection from proxy.ts (covers every /dashboard/* path).
 *
 * The drawer's "View full help →" link points at #reading-the-reports. The
 * first "Reading the reports" section rendered on the page (i.e. the current
 * user's tier) carries that id so the anchor lands on it. See help-content.tsx.
 *
 * Copy is sourced from lib/help/content.ts → HELP_CONTENT (via
 * getHelpContentByTier), and the "Reading the reports" section pulls its
 * per-report lines from lib/utils/report-registry.ts at render time.
 */

import { Suspense } from 'react'
import { connection } from 'next/server'
import { getCurrentUserRole } from '@/lib/actions/auth-actions'
import { HelpContent } from '@/components/help/help-content'
import { Skeleton } from '@/components/ui/skeleton'

async function HelpPageContent() {
  await connection()
  const role = await getCurrentUserRole()

  return (
    <div className="space-y-xl">
      <div className="space-y-1">
        <h1 className="text-heading-2 font-bold text-foreground">
          Help &amp; Onboarding
        </h1>
        <p className="text-paragraph-small text-muted-foreground">
          Quick reference for every tier. Your tier appears first.
        </p>
      </div>
      <HelpContent variant="page" role={role} />
    </div>
  )
}

function HelpPageSkeleton() {
  return (
    <div className="space-y-xl">
      <div className="space-y-2">
        <Skeleton className="h-8 w-[280px] rounded-md" />
        <Skeleton className="h-4 w-[420px] rounded-md" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    </div>
  )
}

export default function HelpPage() {
  return (
    <Suspense fallback={<HelpPageSkeleton />}>
      <HelpPageContent />
    </Suspense>
  )
}