'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, UserPlus } from 'lucide-react'
import { inviteUser } from '@/lib/actions/user-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export function InviteUserDialog({ 
  regions, 
  churches 
}: { 
  regions: { id: string, name: string }[]
  churches: { id: string, church_name: string, church_code: string }[]
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState('REGIONAL_CHAIRMAN')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    
    const formData = new FormData(e.currentTarget)
    const result = await inviteUser(formData)
    
    if (result.error) {
      toast.error(result.error)
      setLoading(false)
    } else {
      toast.success('User invited successfully')
      setOpen(false)
      setLoading(false)
      router.refresh()
    }
  }

  const isRegional = role.includes('REGIONAL')
  const isLocal = role.includes('CHURCH') || role.includes('LOCAL')

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button className="h-9 bg-primary hover:bg-primary/90 text-primary-foreground">
          <UserPlus className="mr-2 h-4 w-4" /> Invite User
        </Button>
      } />
      
      {/* INLINE STYLE FIX for dialog width */}
      <DialogContent style={{ maxWidth: '28rem' }}>
        <DialogHeader>
          <DialogTitle>Invite New User</DialogTitle>
          <DialogDescription>
            Create a new account and assign their system role.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div>
            <label className="block text-paragraph-small font-medium text-foreground mb-xs">Email Address</label>
            <Input name="email" type="email" required placeholder="name@maranatha.org" className="h-9" />
          </div>

          <div>
            <label className="block text-paragraph-small font-medium text-foreground mb-xs">Temporary Password</label>
            <Input name="password" type="password" required minLength={6} placeholder="Min 6 characters" className="h-9" />
          </div>

          <div>
            <label className="block text-paragraph-small font-medium text-foreground mb-xs">Role</label>
            <select
              name="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="flex h-9 w-full rounded-md border border-border bg-card px-3 py-1 text-paragraph-small text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="NATIONAL_HQ">National HQ Admin</option>
              <option value="NATIONAL_TREASURER">National Treasurer</option>
              <option value="REGIONAL_CHAIRMAN">Regional Chairman</option>
              <option value="REGIONAL_TREASURER">Regional Treasurer</option>
              <option value="CHURCH_TREASURER">Church Treasurer</option>
              <option value="LOCAL_PASTOR">Local Pastor</option>
            </select>
          </div>

          {isRegional && (
            <div>
              <label className="block text-paragraph-small font-medium text-foreground mb-xs">Assign Region</label>
              <select
                name="region_id"
                required
                className="flex h-9 w-full rounded-md border border-border bg-card px-3 py-1 text-paragraph-small text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Select a region...</option>
                {regions.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          )}

          {isLocal && (
            <div>
              <label className="block text-paragraph-small font-medium text-foreground mb-xs">Assign Church</label>
              <select
                name="church_id"
                required
                className="flex h-9 w-full rounded-md border border-border bg-card px-3 py-1 text-paragraph-small text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Select a church...</option>
                {churches.map(c => (
                  <option key={c.id} value={c.id}>{c.church_code} - {c.church_name}</option>
                ))}
              </select>
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full mt-2 h-9">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {loading ? 'Creating Account...' : 'Send Invitation'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}