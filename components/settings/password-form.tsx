'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function PasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Password updated successfully')
      setPassword('')
      setConfirmPassword('')
    }
  }

  return (
    <Card className="h-full w-full min-w-0">
      <CardHeader>
        <CardTitle>Security</CardTitle>
        <CardDescription>
          Update the password associated with your account.
        </CardDescription>
      </CardHeader>
      <CardContent className="min-w-0">
        <form onSubmit={handleSubmit} className="space-y-4 w-full">
          <div>
            <label className="block text-paragraph-small font-medium text-foreground mb-xs">
              New Password
            </label>
            <Input 
              type="password"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Enter new password" 
              className="h-9"
              required 
            />
          </div>

          <div>
            <label className="block text-paragraph-small font-medium text-foreground mb-xs">
              Confirm Password
            </label>
            <Input 
              type="password"
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
              placeholder="Confirm new password" 
              className="h-9"
              required 
            />
          </div>

          <Button 
            type="submit" 
            disabled={loading || !password || !confirmPassword} 
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-9 mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Password'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}