'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { sendReminder } from '@/lib/actions/sms-actions'
import { Button } from '@/components/ui/button'
import { Loader2, ShieldAlert } from 'lucide-react'
import type { ChurchRow } from './church-table'

export function SendViewReminderButton({ church }: { church: ChurchRow }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSend() {
    setLoading(true)
    // Send the reminder to the Pastor
    const result = await sendReminder(
      church.church_code, 
      church.church_name, 
      church.pastor_name, 
      church.pastor_phone
    )
    
    setLoading(false)

      if (result?.error) {
      toast.error('Failed to send reminder', { description: result.error })
    } else {
      toast.success(`Reminder sent to Pastor ${church.pastor_name}`)
      router.refresh()
    }
  }

  return (
    <Button onClick={handleSend} disabled={loading} className="bg-primary text-primary-foreground">
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <ShieldAlert className="mr-2 h-4 w-4" />
      )}
      {loading ? 'Sending...' : 'Send Reminder'}
    </Button>
  )
}