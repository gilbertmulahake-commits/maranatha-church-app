import { CreateRegionDialog } from '@/components/regions/create-region-dialog'
import { Suspense } from 'react'
import { AppShell } from '@/components/layout/app-shell'
import { getRegions } from '@/lib/actions/region-actions'
import { MapPin } from 'lucide-react'

// 1. We create an async component that does the data fetching
async function RegionsList() {
  const regions = await getRegions()

  if (regions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E2E8F0] bg-white p-12 text-center">
        <MapPin className="mx-auto h-12 w-12 text-[#64748B]" />
        <h3 className="mt-4 text-lg font-medium text-[#0F172A]">No regions yet</h3>
        <p className="mt-1 text-sm text-[#64748B]">
          Get started by creating your first region.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {regions.map((region) => (
        <div
          key={region.id}
          className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-[#0F172A]">{region.name}</h3>
          <div className="mt-4 space-y-2 text-sm text-[#64748B]">
            <p>
              <span className="font-medium text-[#0F172A]">Chairman:</span>{' '}
              {region.chairman_name}
            </p>
            <p>
              <span className="font-medium text-[#0F172A]">Contact:</span>{' '}
              {region.contact_phone}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

// 2. The main page wraps the list in a Suspense boundary
export default function RegionsPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A]">Regions</h1>
            <p className="mt-1 text-sm text-[#64748B]">
              Manage the 60 regional units.
            </p>
          </div>
        </div>

        <CreateRegionDialog />

        <Suspense fallback={<p className="text-sm text-[#64748B]">Fetching regions from database...</p>}>
          <RegionsList />
        </Suspense>
      </div>
    </AppShell>
  )
}