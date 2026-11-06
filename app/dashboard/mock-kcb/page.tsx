import { Suspense } from 'react'
import { connection } from 'next/server'
import { AppShell } from '@/components/layout/app-shell'
import { MockKCBForm } from '@/components/mock-kcb-form'

async function Content() {
  // Force this route to render dynamically at request time
  await connection()

  return (
    <AppShell>
      <MockKCBForm />
    </AppShell>
  )
}

export default function MockKCBPage() {
  return (
    <Suspense fallback={<div className="p-xl text-muted-foreground">Loading simulator...</div>}>
      <Content />
    </Suspense>
  )
}