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
      router.refresh()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="bg-primary hover:bg-primary/90 text-primary-foreground h-9">Add Region</Button>} />
      
      <DialogContent className="sm:max-w-[425px] p-xl">
        <DialogHeader>
          <DialogTitle>Add New Region</DialogTitle>
          <DialogDescription>
            Create a new regional unit. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        
        <form action={handleSubmit} className="space-y-md pt-md">
          <div>
            <label htmlFor="name" className="block text-paragraph-small font-medium text-foreground mb-xs">
              Region Name
            </label>
            <Input id="name" name="name" placeholder="e.g., Northern" className="h-9" required />
          </div>
          <div>
            <label htmlFor="chairman_name" className="block text-paragraph-small font-medium text-foreground mb-xs">
              Chairman Name
            </label>
            <Input id="chairman_name" name="chairman_name" placeholder="e.g., Rev. John Doe" className="h-9" required />
          </div>
          <div>
            <label htmlFor="contact_phone" className="block text-paragraph-small font-medium text-foreground mb-xs">
              Contact Phone
            </label>
            <Input id="contact_phone" name="contact_phone" placeholder="e.g., 0712345678" className="h-9" required />
          </div>

          {error && <p className="text-paragraph-small text-destructive mt-xs">{error}</p>}

          <DialogFooter className="mt-xl">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-9">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90 text-primary-foreground h-9">
              {loading ? 'Saving...' : 'Save Region'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}