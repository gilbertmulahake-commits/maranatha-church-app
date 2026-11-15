'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const initSession = async () => {
      try {
        const params = new URLSearchParams(window.location.search)
        const urlError = params.get('error')
        const tokenHash = params.get('token_hash')
        const type = params.get('type')

        // Case 1: Supabase passed an error in the URL
        if (urlError) {
          setError('Invalid or expired reset link. Please request a new one.')
          window.history.replaceState({}, '', window.location.pathname)
          setCheckingSession(false)
          return
        }

        // Case 2: A token_hash is present — use verifyOtp to establish the session
        if (tokenHash && type === 'recovery') {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          })

          if (verifyError) {
            setError(verifyError.message || 'Invalid or expired reset link. Please request a new one.')
          } else {
            // Clean the URL so refresh doesn't retry the exchange
            window.history.replaceState({}, '', window.location.pathname)
          }
          setCheckingSession(false)
          return
        }

        // Case 3: No token_hash, no error — check if user already has a session
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setError('No reset link detected. Please check your email or request a new link.')
        }
        setCheckingSession(false)
      } catch (err) {
        console.error('Session init failed:', err)
        setError('Something went wrong. Please request a new reset link.')
        setCheckingSession(false)
      }
    }
    initSession()
  }, [supabase])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
      setTimeout(() => {
        window.location.replace('/login')
      }, 3000)
    }
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verifying reset link...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-[28rem] space-y-6 rounded-xl bg-card p-6 sm:p-8 shadow-sm border border-border">
        
        <div className="text-center">
          <h2 className="text-heading-2 font-bold tracking-tight text-foreground">
            Set New Password
          </h2>
          <p className="mt-2 text-paragraph-small text-muted-foreground">
            Please enter your new password below.
          </p>
        </div>

        {success ? (
          <div className="space-y-4 text-center">
            <div className="rounded-md bg-emerald-50 p-4 text-sm text-emerald-700 border border-emerald-200 flex flex-col items-center gap-2">
              <CheckCircle2 className="h-6 w-6" />
              <span>Password updated successfully!</span>
              <span className="text-xs">Redirecting to login...</span>
            </div>
          </div>
        ) : (
          <form className="space-y-6" onSubmit={handleUpdate}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-10 bg-card"
                  disabled={!!error}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-10 bg-card"
                  disabled={!!error}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-paragraph-small text-destructive border border-destructive/20">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || !password || !confirmPassword || !!error}
              className="w-full h-10 font-semibold"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}