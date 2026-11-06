'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateChurch } from '@/lib/actions/church-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { ChurchRow } from './church-table'

export function EditChurchDialog({ church, onClose }: { church: ChurchRow | null, onClose: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(formData: FormData) {
    if (!church) return
    setLoading(true)
    setError(null)
    
    const result = await updateChurch(church.id, formData)
    
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
    <Dialog open={!!church} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-[500px] p-xl">
        <DialogHeader>
          <DialogTitle>Edit Church</DialogTitle>
          <DialogDescription>Update details for {church?.church_name}.</DialogDescription>
        </DialogHeader>
        {church && (
          <form action={handleSubmit} className="space-y-md pt-md">
            <div>
              <label className="block text-paragraph-small font-medium text-foreground mb-xs">Church Name</label>
              <Input name="church_name" defaultValue={church.church_name} className="h-9" required />
            </div>
            <div className="grid grid-cols-2 gap-md">
              <div>
                <label className="block text-paragraph-small font-medium text-foreground mb-xs">Pastor Name</label>
                <Input name="pastor_name" defaultValue={church.pastor_name} className="h-9" required />
              </div>
              <div>
                <label className="block text-paragraph-small font-medium text-foreground mb-xs">Pastor Phone</label>
                <Input name="pastor_phone" defaultValue={church.pastor_phone} className="h-9" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-md">
              <div>
                <label className="block text-paragraph-small font-medium text-foreground mb-xs">Treasurer Name</label>
                <Input name="treasurer_name" defaultValue={church.treasurer_name} className="h-9" required />
              </div>
              <div>
                <label className="block text-paragraph-small font-medium text-foreground mb-xs">Treasurer Phone</label>
                <Input name="contact_phone" defaultValue={church.contact_phone} className="h-9" required />
              </div>
            </div>
            {error && <p className="text-paragraph-small text-destructive mt-xs">{error}</p>}
            <DialogFooter className="mt-xl">
              <Button type="button" variant="outline" onClick={onClose} className="h-9">Cancel</Button>
              <Button type="submit" disabled={loading} className="bg-primary text-primary-foreground h-9">
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}