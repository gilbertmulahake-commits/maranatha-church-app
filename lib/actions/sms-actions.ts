'use server'

import { prisma } from '@/lib/prisma'

export async function sendSms(phone: string, message: string, type: 'Receipt' | 'Reminder') {
  try {
    // 1. Log to console for development visibility
    console.log(`\n--- MOCK SMS SENT TO ${phone} ---`)
    console.log(`Type: ${type}`)
    console.log(`Message: ${message}`)
    console.log(`---------------------------------\n`)

    // 2. Save the SMS to the database so it can be audited later
    const smsLog = await prisma.smsLog.create({
      data: {
        phone,
        message,
        type,
        status: 'Sent',
      },
    })

    return { success: true, id: smsLog.id }
  } catch (error) {
    console.error('Failed to send mock SMS:', error)
    return { error: 'Failed to send SMS' }
  }
}

export async function sendReminder(churchId: string, churchName: string, pastorName: string, phone: string) {
  try {
    const message = `Dear Pastor ${pastorName}, our records show ${churchName} (${churchId}) contributions are pending. Please advise your treasurer to remit via KCB Paybill. Thank you. - Maranatha`
    
    const result = await sendSms(phone, message, 'Reminder')
    
    if (result.error) {
      return { error: result.error }
    }
    
    return { success: true }
  } catch (error) {
    console.error('Reminder error:', error)
    return { error: 'Failed to send reminder' }
  }
}