export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-KE', { 
    style: 'currency', 
    currency: 'KES', 
    maximumFractionDigits: 0 
  }).format(amount)
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat('en-KE', { 
    dateStyle: 'medium', 
    timeStyle: 'short' 
  }).format(new Date(date))
}
/**
 * Translates a raw credit amount into a human-readable Prepaid status.
 * Returns null if there is no credit (i.e., the church owes money).
 */
export function formatPrepaidStatus(credit: number, type: 'Annual' | 'Monthly'): string | null {
  if (credit <= 0) return null

  const formatter = new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  })

  if (type === 'Annual') {
    const years = Math.floor(credit / 5000)
    if (years >= 1) {
      return `Paid (${years} Year${years > 1 ? 's' : ''} Prepaid)`
    }
    return `Credit: ${formatter.format(credit)}`
  } else {
    const months = Math.floor(credit / 500)
    if (months >= 1) {
      return `Paid (${months} Month${months > 1 ? 's' : ''} Prepaid)`
    }
    return `Credit: ${formatter.format(credit)}`
  }
}