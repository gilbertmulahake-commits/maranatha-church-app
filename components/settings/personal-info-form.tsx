'use client'

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { updateUserProfile, type UserProfile } from '@/lib/actions/user-actions'

export function PersonalInfoForm({ profile }: { profile: UserProfile }) {
  const router = useRouter()

  const [firstName, setFirstName] = useState(profile.first_name ?? '')
  const [lastName, setLastName] = useState(profile.last_name ?? '')
  const [phone, setPhone] = useState(profile.phone ?? '')
  const [bio, setBio] = useState(profile.bio ?? '')
  const [saving, setSaving] = useState(false)

  const isDirty =
    firstName !== (profile.first_name ?? '') ||
    lastName !== (profile.last_name ?? '') ||
    phone !== (profile.phone ?? '') ||
    bio !== (profile.bio ?? '')

  // beforeunload guard while the form has unsaved changes.
  // No setState in this effect body - complies with react-hooks/set-state-in-effect.
  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('first_name', firstName)
      fd.append('last_name', lastName)
      fd.append('phone', phone)
      fd.append('bio', bio)

      const result = await updateUserProfile(fd)
      if ('error' in result) {
        toast.error(result.error)
      } else {
        toast.success('Profile updated')
        router.refresh()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="w-full min-w-0">
      <CardHeader>
        <CardTitle className="text-heading-4 font-bold text-foreground">Personal Information</CardTitle>
        <CardDescription>Update the personal details associated with your account.</CardDescription>
      </CardHeader>
      <CardContent className="min-w-0">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 @[600px]:grid-cols-2 gap-md">
            <div>
              <label htmlFor="first-name" className="block text-paragraph-small font-medium text-foreground mb-xs">
                First Name
              </label>
              <Input
                id="first-name"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. John"
                className="h-9"
                autoComplete="given-name"
              />
            </div>
            <div>
              <label htmlFor="last-name" className="block text-paragraph-small font-medium text-foreground mb-xs">
                Last Name
              </label>
              <Input
                id="last-name"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Kamau"
                className="h-9"
                autoComplete="family-name"
              />
            </div>
          </div>

          <div>
            <label htmlFor="phone" className="block text-paragraph-small font-medium text-foreground mb-xs">
              Phone
            </label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +254 700 000 000"
              className="h-9"
              autoComplete="tel"
            />
          </div>

          <div>
            <label htmlFor="bio" className="block text-paragraph-small font-medium text-foreground mb-xs">
              Bio
            </label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setBio(e.target.value)}
              placeholder="Optional short description"
              rows={4}
            />
          </div>

          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              disabled={!isDirty || saving}
              className="bg-primary hover:bg-primary/90 text-primary-foreground h-9"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}