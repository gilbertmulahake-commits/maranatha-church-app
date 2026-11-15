'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login/update-password`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-[28rem] space-y-6 rounded-xl bg-card p-6 sm:p-8 shadow-sm border border-border">
        
        <div className="text-center">
          <h2 className="text-heading-2 font-bold tracking-tight text-foreground">
            Reset Password
          </h2>
          <p className="mt-2 text-paragraph-small text-muted-foreground">
            Enter your email address and we will send you a link to reset your password.
          </p>
        </div>

        {success ? (
          <div className="space-y-4 text-center">
            <div className="rounded-md bg-emerald-50 p-4 text-sm text-emerald-700 border border-emerald-200">
              Check your email for a link to reset your password. If it doesn't appear within a few minutes, check your spam folder.
            </div>
            <Link href="/login">
              <Button variant="outline" className="w-full">
                Return to Login
              </Button>
            </Link>
          </div>
        ) : (
          <form className="space-y-6" onSubmit={handleReset}>
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="treasurer@church.org"
                className="h-10 bg-card"
              />
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-paragraph-small text-destructive border border-destructive/20">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || !email}
              className="w-full h-10 font-semibold"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Sending link...' : 'Send Reset Link'}
            </Button>
          </form>
        )}

        <div className="text-center mt-4">
          <Link href="/login" className="inline-flex items-center text-sm font-medium text-primary hover:underline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to login
          </Link>
        </div>
        
      </div>
    </div>
  )
}