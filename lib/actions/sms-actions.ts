'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

// ============================================================================
// AFRICA'S TALKING CONFIGURATION
// Defaults to production, but overridable via env var for staging/sandbox.
// ============================================================================

const DEFAULT_AT_ENDPOINT = 'https://api.africastalking.com/version1/messaging'
const KENYA_COUNTRY_CODE = '254'

// ============================================================================
// PHONE NORMALIZATION
// Converts local Kenyan formats to E.164 (required by Africa's Talking).
// Examples:
//   0723456789     -> +254723456789
//   723456789      -> +254723456789
//   254723456789   -> +254723456789
//   +254723456789  -> +254723456789 (idempotent)
// ============================================================================

function normalizeKenyanPhone(phone: string): string {
  const cleaned = phone.replace(/\s+/g, '').replace(/-/g, '')

  if (cleaned.startsWith('+254')) return cleaned
  if (cleaned.startsWith('254')) return `+${cleaned}`
  if (cleaned.startsWith('0')) return `+${KENYA_COUNTRY_CODE}${cleaned.slice(1)}`
  if (/^[71]\d{8}$/.test(cleaned)) return `+${KENYA_COUNTRY_CODE}${cleaned}`

  return `+${cleaned}`
}

// ============================================================================
// AFRICA'S TALKING RESPONSE TYPE
// Only the fields we actually consume.
// ============================================================================

interface AfricaTalkingResponse {
  SMSMessageData?: {
    Message?: string
    Recipients?: Array<{
      statusCode?: number
      number?: string
      cost?: string
      status?: string
      messageId?: string
    }>
  }
}

// ============================================================================
// CORE SMS FUNCTION
// Production: calls the real Africa's Talking API.
// Development: logs to console (mock), writes to SmsLog for audit.
// Both paths write to SmsLog — production also records 'Failed' status.
// ============================================================================

export async function sendSms(
  phone: string,
  message: string,
  type: 'Receipt' | 'Reminder'
) {
  const normalizedPhone = normalizeKenyanPhone(phone)

  // --- PRODUCTION: real Africa's Talking API ---
  if (process.env.NODE_ENV === 'production') {
    const apiKey = process.env.AFRICASTALKING_API_KEY
    const username = process.env.AFRICASTALKING_USERNAME
    const atEndpoint = process.env.AFRICASTALKING_API_URL || DEFAULT_AT_ENDPOINT

    if (!apiKey || !username) {
      console.error('Africa\'s Talking credentials missing in production environment')
      return { error: 'SMS configuration missing' }
    }

    try {
      const body = new URLSearchParams({
        username,
        to: normalizedPhone,
        message,
      })

      const response = await fetch(atEndpoint, {
        method: 'POST',
        headers: {
          apiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: body.toString(),
      })

      if (!response.ok) {
        const text = await response.text()
        console.error('Africa\'s Talking HTTP error:', response.status, text)
        await safeLogSms(phone, message, type, 'Failed')
        return { error: `SMS API returned ${response.status}` }
      }

      const data = (await response.json()) as AfricaTalkingResponse
      const recipient = data.SMSMessageData?.Recipients?.[0]
      const isSuccess = recipient?.status === 'Success'

      if (!isSuccess) {
        console.error('Africa\'s Talking rejected SMS:', recipient?.status)
        await safeLogSms(phone, message, type, 'Failed')
        return { error: `SMS rejected: ${recipient?.status ?? 'unknown'}` }
      }

      // CRITICAL: If the SMS was sent successfully, we MUST return success
      // to the UI even if the SmsLog DB write fails. Otherwise the user
      // will retry and send a duplicate SMS.
      const logId = await safeLogSms(phone, message, type, 'Sent')
      return { success: true, id: logId }
    } catch (error) {
      console.error('Africa\'s Talking fetch failed:', error)
      await safeLogSms(phone, message, type, 'Failed')
      return { error: 'Failed to send SMS' }
    }
  }

  // --- DEVELOPMENT: mock (console + SmsLog) ---
  try {
    console.log(`\n--- MOCK SMS SENT TO ${phone} (${normalizedPhone}) ---`)
    console.log(`Type: ${type}`)
    console.log(`Message: ${message}`)
    console.log(`-------------------------------------------------------\n`)

    const logId = await safeLogSms(phone, message, type, 'Sent')
    return { success: true, id: logId }
  } catch (error) {
    console.error('Failed to send mock SMS:', error)
    return { error: 'Failed to send SMS' }
  }
}

// ============================================================================
// SAFE SMS LOG WRITER
// Writes to SmsLog but never throws. If it fails, we log the error
// server-side and return undefined so the caller can still succeed.
// ============================================================================

async function safeLogSms(
  phone: string,
  message: string,
  type: 'Receipt' | 'Reminder',
  status: 'Sent' | 'Failed'
): Promise<string | undefined> {
  try {
    const smsLog = await prisma.smsLog.create({
      data: { phone, message, type, status },
    })
    return smsLog.id
  } catch (error) {
    console.error('CRITICAL: SmsLog database write failed:', error)
    return undefined
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
// ============================================================================
export async function sendBulkReminders(
  recipients: {
    phone: string,
    name: string,
    type: 'Pastor' | 'Chairman',
    annualOutstanding?: number,
    monthlyOutstanding?: number
  }[],
  senderRole: SenderRole = 'REGIONAL'
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

    revalidatePath('/dashboard/churches')
    revalidatePath('/dashboard/regional')

    return { success: true, successCount, failCount }
  } catch (error) {
    console.error('Bulk SMS error:', error)
    return { error: 'Failed to send bulk reminders' }
  }
}