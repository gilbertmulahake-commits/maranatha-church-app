'use server'

import { prisma } from '@/lib/prisma'

export async function sendSms(phone: string, message: string, type: 'Receipt' | 'Reminder') {
  try {
    console.log(`\n--- MOCK SMS SENT TO ${phone} ---`)
    console.log(`Type: ${type}`)
    console.log(`Message: ${message}`)
    console.log(`---------------------------------\n`)

    const smsLog = await prisma.smsLog.create({
      data: { phone, message, type, status: 'Sent' },
    })

    return { success: true, id: smsLog.id }
  } catch (error) {
    console.error('Failed to send mock SMS:', error)
    return { error: 'Failed to send SMS' }
  }
}

// NEW: Sender context for reminders
type SenderRole = 'NATIONAL' | 'REGIONAL'

function getSenderLabel(role: SenderRole): string {
  return role === 'NATIONAL' 
    ? 'the Maranatha National Office' 
    : 'the Maranatha Regional Office'
}

export async function sendReminder(
  churchId: string, 
  churchName: string, 
  pastorName: string, 
  phone: string,
  senderRole: SenderRole = 'REGIONAL'
) {
  try {
    const message = `Dear Pastor ${pastorName}, this is a reminder from ${getSenderLabel(senderRole)}. Our records show ${churchName} (${churchId}) contributions are pending. Please advise your treasurer to remit via KCB Paybill. Thank you.`
    
    const result = await sendSms(phone, message, 'Reminder')
    
    if (result.error) return { error: result.error }
    return { success: true }
  } catch (error) {
    console.error('Reminder error:', error)
    return { error: 'Failed to send reminder' }
  }
}

export async function sendChairmanReminder(
  regionName: string, 
  chairmanName: string, 
  phone: string, 
  compliancePct: number,
  arrears: number
) {
  try {
    const formattedArrears = new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(arrears)
    
    // Chairman reminders are always from National Office (only National can trigger this)
    const message = `Dear Chairman ${chairmanName}, this is a reminder from ${getSenderLabel('NATIONAL')}. ${regionName} Region currently has a compliance rate of ${compliancePct.toFixed(1)}% with ${formattedArrears} in arrears. Please follow up with your local pastors. - Maranatha`
    
    const result = await sendSms(phone, message, 'Reminder')
    
    if (result.error) return { error: result.error }
    return { success: true }
  } catch (error) {
    console.error('Chairman SMS error:', error)
    return { error: 'Failed to send reminder' }
  }
}

export async function sendBulkReminders(
  recipients: { phone: string, name: string, type: 'Pastor' | 'Chairman' }[],
  senderRole: SenderRole = 'REGIONAL'
) {
  try {
    let successCount = 0
    let failCount = 0

    for (const recipient of recipients) {
      const message = recipient.type === 'Pastor'
        ? `Dear Pastor ${recipient.name}, this is a reminder from ${getSenderLabel(senderRole)}. Our records show your church contributions are pending. Please advise your treasurer to remit via KCB Paybill. Thank you.`
        : `Dear Chairman ${recipient.name}, this is a reminder from ${getSenderLabel('NATIONAL')}. Your region has pending compliance requirements. Please follow up with your local pastors. - Maranatha`

      const result = await sendSms(recipient.phone, message, 'Reminder')
      
      if (result.success) successCount++
      else failCount++
    }

    return { success: true, successCount, failCount }
  } catch (error) {
    console.error('Bulk SMS error:', error)
    return { error: 'Failed to send bulk reminders' }
  }
}