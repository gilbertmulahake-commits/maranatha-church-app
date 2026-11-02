// Constants based on the business rules
export const ANNUAL_FEE = 5000
export const MONTHLY_FEE = 500
export const TOTAL_EXPECTED_PER_CHURCH = 11000

// The annual fee is due by the end of March (Month index 2)
const ANNUAL_DUE_MONTH_INDEX = 2 

export function getExpectedToDate(upToDate: Date = new Date()) {
  const currentYear = upToDate.getFullYear()
  const currentMonthIndex = upToDate.getMonth() // 0 = Jan, 11 = Dec

  // 1. Calculate Annual Expected (Due after March 31st)
  // If current month is > March (index 2), the annual fee is due.
  const annualExpected = currentMonthIndex > ANNUAL_DUE_MONTH_INDEX ? ANNUAL_FEE : 0

  // 2. Calculate Monthly Expected 
  // If it's Jan 15th (index 0), 0 months are due. 
  // If it's Feb 1st (index 1), 1 month (Jan) is due.
  const monthlyExpected = currentMonthIndex * MONTHLY_FEE

  return {
    annualExpected,
    monthlyExpected,
    totalExpected: annualExpected + monthlyExpected,
  }
}

export function getChurchStatus(
  totalPaid: number, 
  expectedToDate: number
): 'Paid' | 'Partial' | 'Overdue' {
  if (totalPaid >= expectedToDate) {
    return 'Paid'
  }
  
  if (totalPaid > 0) {
    return 'Partial'
  }

  // If they haven't paid anything and something is expected, they are overdue.
  if (expectedToDate > 0) {
    return 'Overdue'
  }

  // If nothing is expected yet (e.g., early January) and they haven't paid, they are just 'Pending'
  return 'Partial' // Or we can add a 'Pending' state if we want to distinguish
}