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
      const form = document.getElementById('create-church-form') as HTMLFormElement
      form?.reset()
      router.refresh()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="bg-primary hover:bg-primary/90 text-primary-foreground h-9">Add Church</Button>} />
      <DialogContent className="sm:max-w-[550px] p-xl">
        <DialogHeader>
          <DialogTitle>Register New Church</DialogTitle>
          <DialogDescription>
            Add a new local church to the system.
          </DialogDescription>
        </DialogHeader>
        
        <form id="create-church-form" action={handleSubmit} className="space-y-md pt-md">
          <div className="grid grid-cols-2 gap-md">
            <div>
              <label htmlFor="church_code" className="block text-paragraph-small font-medium text-foreground mb-xs">
                Church ID
              </label>
              <Input id="church_code" name="church_code" placeholder="e.g., CH001" className="h-9" required />
            </div>
            <div>
              <label htmlFor="church_name" className="block text-paragraph-small font-medium text-foreground mb-xs">
                Church Name
              </label>
              <Input id="church_name" name="church_name" placeholder="e.g., Grace Fellowship" className="h-9" required />
            </div>
          </div>

          <div>
            <label htmlFor="region_id" className="block text-paragraph-small font-medium text-foreground mb-xs">
              Region
            </label>
            <select
              id="region_id"
              name="region_id"
              required
              className="mt-1 block w-full h-9 rounded-md border border-border bg-card px-3 py-2 text-paragraph-small text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Select a region...</option>
              {regions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-md">
            <div>
              <label htmlFor="pastor_name" className="block text-paragraph-small font-medium text-foreground mb-xs">
                Pastor Name
              </label>
              <Input id="pastor_name" name="pastor_name" placeholder="e.g., Rev. Peter" className="h-9" required />
            </div>
            <div>
              <label htmlFor="pastor_phone" className="block text-paragraph-small font-medium text-foreground mb-xs">
                Pastor Phone
              </label>
              <Input id="pastor_phone" name="pastor_phone" placeholder="e.g., 0723456789" className="h-9" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-md">
            <div>
              <label htmlFor="treasurer_name" className="block text-paragraph-small font-medium text-foreground mb-xs">
                Treasurer Name
              </label>
              <Input id="treasurer_name" name="treasurer_name" placeholder="e.g., John Doe" className="h-9" required />
            </div>
            <div>
              <label htmlFor="contact_phone" className="block text-paragraph-small font-medium text-foreground mb-xs">
                Treasurer Phone
              </label>
              <Input id="contact_phone" name="contact_phone" placeholder="e.g., 0712345678" className="h-9" required />
            </div>
          </div>

          {error && <p className="text-paragraph-small text-destructive mt-xs">{error}</p>}

          <DialogFooter className="mt-xl">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-9">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90 text-primary-foreground h-9">
              {loading ? 'Saving...' : 'Save Church'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}