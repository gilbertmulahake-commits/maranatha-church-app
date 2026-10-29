'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createRegion } from '@/lib/actions/region-actions'
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

export function CreateRegionDialog() {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    
    const result = await createRegion(formData)
    
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setOpen(false)
      setLoading(false)
      router.refresh() // Refresh the page to show the new region
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="bg-[#0F172A] hover:bg-[#1E293B]">Add Region</Button>} />
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Region</DialogTitle>
          <DialogDescription>
            Create a new regional unit. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        
        <form action={handleSubmit} className="space-y-4 pt-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-[#0F172A]">
              Region Name
            </label>
            <Input id="name" name="name" placeholder="e.g., Northern" required />
          </div>
          <div>
            <label htmlFor="chairman_name" className="block text-sm font-medium text-[#0F172A]">
              Chairman Name
            </label>
            <Input id="chairman_name" name="chairman_name" placeholder="e.g., Rev. John Doe" required />
          </div>
          <div>
            <label htmlFor="contact_phone" className="block text-sm font-medium text-[#0F172A]">
              Contact Phone
            </label>
            <Input id="contact_phone" name="contact_phone" placeholder="e.g., 0712345678" required />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-[#0F172A] hover:bg-[#1E293B]">
              {loading ? 'Saving...' : 'Save Region'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}