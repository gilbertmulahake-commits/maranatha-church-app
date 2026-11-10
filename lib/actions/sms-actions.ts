'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

// ============================================================================
// CORE SMS FUNCTION
// This is the mocked Africa's Talking sender. It logs the message to the 
// console for visibility and saves it to the SmsLog database table for auditing.
// ============================================================================
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

// ============================================================================
// SENDER IDENTITY HELPER
// Distinguishes whether the reminder is coming from the National Office 
// or a Regional Office to maintain the chain of command.
// ============================================================================
type SenderRole = 'NATIONAL' | 'REGIONAL'

function getSenderLabel(role: SenderRole): string {
  return role === 'NATIONAL' 
    ? 'the Maranatha National Office' 
    : 'the Maranatha Regional Office'
}

// ============================================================================
// SINGLE REMINDER FUNCTION (For a specific Pastor/Church)
// Accepts the breakdown of what is owed so the message is highly specific.
// ============================================================================
export async function sendReminder(
  churchId: string, 
  churchName: string, 
  pastorName: string, 
  phone: string,
  senderRole: SenderRole = 'REGIONAL',
  annualOutstanding: number = 0,
  monthlyOutstanding: number = 0
) {
  try {
    let owedText = ''
    
    if (annualOutstanding > 0 && monthlyOutstanding > 0) {
      owedText = `KES ${annualOutstanding.toLocaleString()} for Annual fees and KES ${monthlyOutstanding.toLocaleString()} for Monthly fees`
    } else if (annualOutstanding > 0) {
      owedText = `KES ${annualOutstanding.toLocaleString()} for Annual fees`
    } else if (monthlyOutstanding > 0) {
      owedText = `KES ${monthlyOutstanding.toLocaleString()} for Monthly fees`
    } else {
      owedText = 'pending contributions'
    }

    const message = `Dear Pastor ${pastorName}, this is a reminder from ${getSenderLabel(senderRole)}. Our records show ${churchName} (${churchId}) has an outstanding balance of ${owedText}. Please advise your treasurer to remit via KCB Paybill. Thank you.`
    
    const result = await sendSms(phone, message, 'Reminder')
    
    if (result.error) return { error: result.error }
    return { success: true }
  } catch (error) {
    console.error('Reminder error:', error)
    return { error: 'Failed to send reminder' }
  }
}

// ============================================================================
// CHAIRMAN REMINDER FUNCTION (For Regional Chairmen)
// Chairmen oversee compliance, so they receive a summary of their region's
// performance and total arrears, rather than a specific fee breakdown.
// ============================================================================
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

// ============================================================================
// BULK REMINDER FUNCTION (For multiple Pastors or Chairmen)
// Loops through the recipients and builds the intelligent message for each.
// ============================================================================
export async function sendBulkReminders(
  recipients: { 
    phone: string, 
    name: string, 
    type: 'Pastor' | 'Chairman',
    annualOutstanding?: number,
    monthlyOutstanding?: number 
  }[],
  senderRole: SenderRole = 'REGIONAL',
  periodView: 'month' | 'year' = 'year'
) {
  try {
    let successCount = 0
    let failCount = 0

    for (const recipient of recipients) {
      let message = ''

      if (recipient.type === 'Chairman') {
        message = `Dear Chairman ${recipient.name}, this is a reminder from ${getSenderLabel('NATIONAL')}. Your region has pending compliance requirements. Please follow up with your local pastors. - Maranatha`
      } else {
        let owedText = ''
        const annual = recipient.annualOutstanding || 0
        const monthly = recipient.monthlyOutstanding || 0

        if (annual > 0 && monthly > 0) {
          owedText = `KES ${annual.toLocaleString()} for Annual and KES ${monthly.toLocaleString()} for Monthly fees`
        } else if (annual > 0) {
          owedText = `KES ${annual.toLocaleString()} for Annual fees`
        } else if (monthly > 0) {
          owedText = `KES ${monthly.toLocaleString()} for Monthly fees`
        } else {
          owedText = 'pending contributions'
        }

        message = `Dear Pastor ${recipient.name}, this is a reminder from ${getSenderLabel(senderRole)}. Our records show your church has an outstanding balance of ${owedText}. Please advise your treasurer to remit via KCB Paybill. Thank you.`
      }

      const result = await sendSms(recipient.phone, message, 'Reminder')
      
      if (result.success) successCount++
      else failCount++
    }

    // Revalidate paths so the UI updates the KPI cards instantly
    revalidatePath('/dashboard/churches')
    revalidatePath('/dashboard/regional')

    return { success: true, successCount, failCount }
  } catch (error) {
    console.error('Bulk SMS error:', error)
    return { error: 'Failed to send bulk reminders' }
  }
}