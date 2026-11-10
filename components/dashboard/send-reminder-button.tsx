'use client'

import { MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { sendReminder } from '@/lib/actions/sms-actions'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'

interface Props {
  churchId: string
  churchName: string
  pastorName: string
  phone: string
  senderRole: 'NATIONAL' | 'REGIONAL'
  annualOutstanding: number
  monthlyOutstanding: number
}

export function SendReminderButton({
  churchId,
  churchName,
  pastorName,
  phone,
  senderRole,
  annualOutstanding,
  monthlyOutstanding,
}: Props) {
  // FIXED: Removed the `e: Event` parameter entirely
  const handleSend = async () => {
    const res = await sendReminder(
      churchId,
      churchName,
      pastorName,
      phone,
      senderRole,
      annualOutstanding,
      monthlyOutstanding
    )

    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success(`Reminder sent to ${pastorName}`)
    }
  }

  return (
    <DropdownMenuItem 
      onClick={handleSend} 
      className="cursor-pointer text-paragraph-small whitespace-nowrap"
    >
      <MessageSquare className="mr-2 h-4 w-4" /> Remind Pastor
    </DropdownMenuItem>
  )
}