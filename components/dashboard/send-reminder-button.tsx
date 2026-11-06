'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { sendReminder } from '@/lib/actions/sms-actions'
import { Button } from '@/components/ui/button'
import { MessageSquare, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function SendReminderButton({ 
  churchId, 
  churchName, 
  pastorName,
  phone,
  senderRole = 'REGIONAL',
  annualOutstanding = 0,
  monthlyOutstanding = 0
}: { 
  churchId: string
  churchName: string
  pastorName: string
  phone: string 
  senderRole?: 'NATIONAL' | 'REGIONAL'
  annualOutstanding?: number
  monthlyOutstanding?: number
}) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSend() {
    setLoading(true)
    
    // Pass the strictly separated outstanding amounts to the server action
    const result = await sendReminder(
      churchId, 
      churchName, 
      pastorName, 
      phone, 
      senderRole,
      annualOutstanding,
      monthlyOutstanding
    )
    
    if (result?.error) {
      toast.error(result.error)
      setLoading(false)
    } else {
      toast.success('Reminder sent successfully')
      setTimeout(() => {
        setLoading(false)
        router.refresh()
      }, 500)
    }
  }

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleSend} 
      disabled={loading}
      className="h-8 text-xs text-primary border-primary/20 hover:bg-primary/10"
    >
      {loading ? (
        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
      ) : (
        <MessageSquare className="mr-2 h-3 w-3" />
      )}
      {loading ? 'Sending...' : 'Remind Pastor'}
    </Button>
  )
}