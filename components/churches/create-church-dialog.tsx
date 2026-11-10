'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createChurch } from '@/lib/actions/church-actions'
import { getRegions } from '@/lib/actions/region-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Plus } from 'lucide-react'
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
      <DialogTrigger 
        render={
          <Button className="h-9">
            <Plus className="mr-2 h-4 w-4" /> Add Church
          </Button>
        } 
      />
      
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Register New Church</DialogTitle>
          <DialogDescription className="text-paragraph-small text-muted-foreground">
            Add a new local church to the national registry.
          </DialogDescription>
        </DialogHeader>
        
        <form id="create-church-form" action={handleSubmit} className="space-y-4 pt-4">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="church_code" className="text-paragraph-small font-medium">Church ID</Label>
              <Input 
                id="church_code" 
                name="church_code" 
                placeholder="e.g., CH001" 
                className="h-9 text-paragraph-small" 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="church_name" className="text-paragraph-small font-medium">Church Name</Label>
              <Input 
                id="church_name" 
                name="church_name" 
                placeholder="e.g., Grace Fellowship" 
                className="h-9 text-paragraph-small" 
                required 
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="region_id" className="text-paragraph-small font-medium">Region</Label>
            <select
              id="region_id"
              name="region_id"
              required
              className="flex h-9 w-full rounded-md border border-border bg-card px-3 py-1 text-paragraph-small text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
            <div className="space-y-2">
              <Label htmlFor="pastor_name" className="text-paragraph-small font-medium">Pastor Name</Label>
              <Input 
                id="pastor_name" 
                name="pastor_name" 
                placeholder="e.g., Rev. Peter" 
                className="h-9 text-paragraph-small" 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pastor_phone" className="text-paragraph-small font-medium">Pastor Phone</Label>
              <Input 
                id="pastor_phone" 
                name="pastor_phone" 
                placeholder="e.g., 0723456789" 
                className="h-9 text-paragraph-small" 
                required 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="treasurer_name" className="text-paragraph-small font-medium">Treasurer Name</Label>
              <Input 
                id="treasurer_name" 
                name="treasurer_name" 
                placeholder="e.g., John Doe" 
                className="h-9 text-paragraph-small" 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_phone" className="text-paragraph-small font-medium">Treasurer Phone</Label>
              <Input 
                id="contact_phone" 
                name="contact_phone" 
                placeholder="e.g., 0712345678" 
                className="h-9 text-paragraph-small" 
                required 
              />
            </div>
          </div>

          {error && (
            <p className="text-paragraph-small font-medium text-destructive">
              {error}
            </p>
          )}

          <DialogFooter className="pt-4 gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)} 
              className="h-9"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading} 
              className="h-9 bg-primary text-primary-foreground"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Saving...' : 'Save Church'}
            </Button>
          </DialogFooter>
          
        </form>
      </DialogContent>
    </Dialog>
  )
}