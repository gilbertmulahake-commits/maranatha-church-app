'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { sendChairmanReminder } from '@/lib/actions/sms-actions'
import { MessageSquare, Loader2 } from 'lucide-react'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'

export function SendChairmanButton({
  regionName,
  chairmanName,
  phone,
  compliancePct,
  arrears
}: {
  regionName: string
  chairmanName: string
  phone: string
  compliancePct: number
  arrears: number
}) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

    async function handleSend() {
    setLoading(true)
    
    const result = await sendChairmanReminder(regionName, chairmanName, phone, compliancePct, arrears)
    
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
    <DropdownMenuItem 
      onSelect={(e) => e.preventDefault()} 
      className="cursor-pointer" 
      onClick={handleSend} 
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <MessageSquare className="mr-2 h-4 w-4" />
      )}
      {loading ? 'Sending...' : 'Send SMS to Chairman'}
    </DropdownMenuItem>
  )

  return (
    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer" onClick={handleSend} disabled={loading}>
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <MessageSquare className="mr-2 h-4 w-4" />
      )}
      {loading ? 'Sending...' : 'Send SMS to Chairman'}
    </DropdownMenuItem>
  )
}