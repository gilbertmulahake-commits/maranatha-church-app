'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateRegion } from '@/lib/actions/region-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function EditRegionDialog({ 
  region,
  onClose
}: { 
  region: { id: string, name: string, chairman_name: string, contact_phone: string } | null
  onClose: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const isOpen = !!region

  async function handleSubmit(formData: FormData) {
    if (!region) return
    setLoading(true)
    setError(null)
    
    const result = await updateRegion(region.id, formData)
    
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      onClose()
      setLoading(false)
      router.refresh()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-[425px] p-xl">
        <DialogHeader>
          <DialogTitle>Edit Region</DialogTitle>
          <DialogDescription>
            Update the details for {region?.name} Region.
          </DialogDescription>
        </DialogHeader>
        
        {region && (
          <form action={handleSubmit} className="space-y-md pt-md">
            <div>
              <label htmlFor="name" className="block text-paragraph-small font-medium text-foreground mb-xs">
                Region Name
              </label>
              <Input id="name" name="name" defaultValue={region.name} className="h-9" required />
            </div>
            <div>
              <label htmlFor="chairman_name" className="block text-paragraph-small font-medium text-foreground mb-xs">
                Chairman Name
              </label>
              <Input id="chairman_name" name="chairman_name" defaultValue={region.chairman_name} className="h-9" required />
            </div>
            <div>
              <label htmlFor="contact_phone" className="block text-paragraph-small font-medium text-foreground mb-xs">
                Contact Phone
              </label>
              <Input id="contact_phone" name="contact_phone" defaultValue={region.contact_phone} className="h-9" required />
            </div>

            {error && <p className="text-paragraph-small text-destructive mt-xs">{error}</p>}

            <DialogFooter className="mt-xl">
              <Button type="button" variant="outline" onClick={onClose} className="h-9">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90 text-primary-foreground h-9">
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}