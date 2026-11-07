'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { sendReminder } from '@/lib/actions/sms-actions'
import { MessageSquare, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'

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
    <DropdownMenuItem 
      onClick={handleSend} 
      disabled={loading}
      className="cursor-pointer text-primary focus:bg-primary/10 focus:text-primary"
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <MessageSquare className="mr-2 h-4 w-4" />
      )}
      {loading ? 'Sending...' : 'Remind Pastor'}
    </DropdownMenuItem>
  )
}