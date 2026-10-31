'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { sendReminder } from '@/lib/actions/sms-actions'
import { Button } from '@/components/ui/button'
import { MessageSquare, Loader2 } from 'lucide-react'

export function SendReminderButton({ 
  churchId, 
  churchName, 
  pastorName,
  phone 
}: { 
  churchId: string
  churchName: string
  pastorName: string
  phone: string 
}) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSend() {
    setLoading(true)
    const result = await sendReminder(churchId, churchName, pastorName, phone)
    
    if (result?.error) {
      alert(result.error)
      setLoading(false)
    } else {
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
      className="h-8 text-xs text-[#2563EB] border-[#2563EB] hover:bg-[#DBEAFE]"
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