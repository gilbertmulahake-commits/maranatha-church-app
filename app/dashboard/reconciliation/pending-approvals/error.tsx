'use client'

import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex h-[400px] flex-col items-center justify-center space-y-4">
      <h2 className="text-heading-3 font-bold text-destructive">Something went wrong!</h2>
      <p className="text-paragraph-small text-muted-foreground">{error.message}</p>
      <Button onClick={() => reset()}>Try again</Button>
    </div>
  )
}