import { Skeleton } from '@/components/ui/skeleton'

export function SystemConfigSkeleton() {
  return (
    <div className="space-y-xl">
      <Skeleton className="h-20 w-full rounded-xl" />
      <div className="grid grid-cols-1 @[800px]:grid-cols-2 gap-md">
        <Skeleton className="h-56 w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  )
}