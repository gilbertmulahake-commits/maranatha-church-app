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