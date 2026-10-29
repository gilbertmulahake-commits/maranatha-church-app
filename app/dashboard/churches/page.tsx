import { Suspense } from 'react'
import { AppShell } from '@/components/layout/app-shell'
import { getChurches } from '@/lib/actions/church-actions'
import { CreateChurchDialog } from '@/components/churches/create-church-dialog'
import { ChurchTable, type ChurchRow } from '@/components/churches/church-table'

async function ChurchesList() {
  const churches = await getChurches()

  // Format data to match the ChurchRow type expected by the table
  const formattedData: ChurchRow[] = churches.map((church) => ({
    id: church.id,
    church_code: church.church_code,
    church_name: church.church_name,
    treasurer_name: church.treasurer_name,
    contact_phone: church.contact_phone,
    region: church.region ? { name: church.region.name } : null,
  }))

  return <ChurchTable data={formattedData} />
}

export default function ChurchesPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A]">Churches</h1>
            <p className="mt-1 text-sm text-[#64748B]">
              Manage all 1,600 local churches across the regions.
            </p>
          </div>
          <CreateChurchDialog />
        </div>

        <Suspense fallback={<p className="text-sm text-[#64748B]">Fetching churches from database...</p>}>
          <ChurchesList />
        </Suspense>
      </div>
    </AppShell>
  )
}