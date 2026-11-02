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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Region</DialogTitle>
          <DialogDescription>
            Update the details for {region?.name} Region.
          </DialogDescription>
        </DialogHeader>
        
        {region && (
          <form action={handleSubmit} className="space-y-4 pt-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-foreground">
                Region Name
              </label>
              <Input id="name" name="name" defaultValue={region.name} required />
            </div>
            <div>
              <label htmlFor="chairman_name" className="block text-sm font-medium text-foreground">
                Chairman Name
              </label>
              <Input id="chairman_name" name="chairman_name" defaultValue={region.chairman_name} required />
            </div>
            <div>
              <label htmlFor="contact_phone" className="block text-sm font-medium text-foreground">
                Contact Phone
              </label>
              <Input id="contact_phone" name="contact_phone" defaultValue={region.contact_phone} required />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}