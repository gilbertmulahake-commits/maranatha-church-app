import { Suspense } from 'react'
import { connection } from 'next/server'
import { MockKcbForm } from '@/components/mock-kcb-form'
import { Skeleton } from '@/components/ui/skeleton'

async function MockKcbContent() {
  await connection()
  
  return (
    <div className="space-y-xl">
      <div className="flex flex-col gap-sm">
        <h1 className="text-heading-2 font-bold text-foreground">Mock KCB Simulator</h1>
        <p className="text-paragraph-small text-muted-foreground">
          Simulate an incoming payment webhook to test the reconciliation and allocation engine.
        </p>
      </div>
      
      <MockKcbForm />
    </div>
  )
}

export default function MockKcbPage() {
  return (
    <Suspense fallback={
      <div className="space-y-xl">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-xl">
          <Skeleton className="h-[450px] rounded-xl" />
          <Skeleton className="h-[450px] rounded-xl" />
        </div>
      </div>
    }>
      <MockKcbContent />
    </Suspense>
  )
}