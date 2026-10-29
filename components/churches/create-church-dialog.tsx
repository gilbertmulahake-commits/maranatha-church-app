'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createChurch } from '@/lib/actions/church-actions'
import { getRegions } from '@/lib/actions/region-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export function CreateChurchDialog() {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [regions, setRegions] = useState<{ id: string; name: string }[]>([])
  const router = useRouter()

  // Fetch regions when the dialog opens so we can populate the dropdown
  useEffect(() => {
    if (open) {
      getRegions().then((data) => setRegions(data))
    }
  }, [open])

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    
    const result = await createChurch(formData)
    
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setOpen(false)
      setLoading(false)
      // Reset the form
      const form = document.getElementById('create-church-form') as HTMLFormElement
      form?.reset()
      router.refresh()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="bg-[#0F172A] hover:bg-[#1E293B]">Add Church</Button>} />
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Register New Church</DialogTitle>
          <DialogDescription>
            Add a new local church to the system.
          </DialogDescription>
        </DialogHeader>
        
        <form id="create-church-form" action={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="church_code" className="block text-sm font-medium text-[#0F172A]">
                Church ID
              </label>
              <Input id="church_code" name="church_code" placeholder="e.g., CH001" required />
            </div>
            <div>
              <label htmlFor="church_name" className="block text-sm font-medium text-[#0F172A]">
                Church Name
              </label>
              <Input id="church_name" name="church_name" placeholder="e.g., Grace Fellowship" required />
            </div>
          </div>

          <div>
            <label htmlFor="region_id" className="block text-sm font-medium text-[#0F172A]">
              Region
            </label>
            <select
              id="region_id"
              name="region_id"
              required
              className="mt-1 block w-full rounded-md border border-[#E2E8F0] px-3 py-2 text-[#0F172A] focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
            >
              <option value="">Select a region...</option>
              {regions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="treasurer_name" className="block text-sm font-medium text-[#0F172A]">
                Treasurer Name
              </label>
              <Input id="treasurer_name" name="treasurer_name" placeholder="e.g., John Doe" required />
            </div>
            <div>
              <label htmlFor="contact_phone" className="block text-sm font-medium text-[#0F172A]">
                Contact Phone
              </label>
              <Input id="contact_phone" name="contact_phone" placeholder="e.g., 0712345678" required />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-[#0F172A] hover:bg-[#1E293B]">
              {loading ? 'Saving...' : 'Save Church'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}