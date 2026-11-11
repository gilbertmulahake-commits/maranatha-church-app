// ==============================================================================
// Bank Adapter Engine
// ==============================================================================
// This file normalizes webhook payloads from different banks (KCB, Equity)
// into a single standard shape (`NormalizedTransaction`).
// 
// It does NOT contain the webhook route handlers or signature verification.
// Those will be implemented separately.

export interface NormalizedTransaction {
  bank_reference: string;    // The unique transaction ID from the bank
  church_code: string;       // The BillRefNumber / Account Number
  amount: number;            // The amount paid (as a float)
  currency: string;          // e.g., 'KES'
  payment_method: string;    // e.g., 'M_Pesa', 'Bank_Transfer'
  transaction_date: Date;    // When the payment occurred
}

// ==============================================================================
// KCB Buni API Normalizer
// ==============================================================================
// Typical KCB IPN payload includes fields like TransactionID, BillRefNumber,
// TransAmount, etc. We treat it as `unknown` and validate it manually.

export function normalizeKcbPayload(payload: unknown): NormalizedTransaction {
  if (!payload || typeof payload !== 'object') {
    throw new Error('KCB Payload must be an object');
  }

  const data = payload as Record<string, unknown>;

  // 1. Extract and validate bank reference
  const bankRef = data.TransactionID || data.transaction_id;
  if (typeof bankRef !== 'string' || !bankRef) {
    throw new Error('KCB Payload missing TransactionID');
  }

  // 2. Extract and validate Church Code (BillRefNumber)
  const churchCode = data.BillRefNumber || data.bill_ref_number;
  if (typeof churchCode !== 'string' || !churchCode) {
    throw new Error('KCB Payload missing BillRefNumber');
  }

  // 3. Extract and validate Amount
  const rawAmount = data.TransAmount || data.trans_amount;
  const amount = typeof rawAmount === 'string' ? parseFloat(rawAmount) : Number(rawAmount);
  if (isNaN(amount)) {
    throw new Error('KCB Payload has invalid TransAmount');
  }

  // 4. Extract date (fallback to now if missing/invalid)
  let transactionDate = new Date();
  const rawDate = data.TransactionTime || data.transaction_time;
  if (typeof rawDate === 'string') {
    const parsed = new Date(rawDate);
    if (!isNaN(parsed.getTime())) {
      transactionDate = parsed;
    }
  }

  return {
    bank_reference: bankRef,
    church_code: churchCode.toUpperCase().trim(),
    amount: amount,
    currency: 'KES', // KCB IPN is typically always KES
    payment_method: 'M_Pesa', // KCB IPN usually represents M-Pesa Paybill payments
    transaction_date: transactionDate,
  };
}

// ==============================================================================
// Equity Jenga API Normalizer
// ==============================================================================
// Typical Equity Jenga IPN payload includes fields like transactionId,
// billNumber, amount, etc.

export function normalizeEquityPayload(payload: unknown): NormalizedTransaction {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Equity Payload must be an object');
  }

  const data = payload as Record<string, unknown>;

  // 1. Extract and validate bank reference
  const bankRef = data.transactionId || data.transaction_reference;
  if (typeof bankRef !== 'string' || !bankRef) {
    throw new Error('Equity Payload missing transactionId');
  }

  // 2. Extract and validate Church Code (billNumber)
  const churchCode = data.billNumber || data.accountNumber || data.bill_number;
  if (typeof churchCode !== 'string' || !churchCode) {
    throw new Error('Equity Payload missing billNumber');
  }

  // 3. Extract and validate Amount
  const rawAmount = data.amount || data.transactionAmount;
  const amount = typeof rawAmount === 'string' ? parseFloat(rawAmount) : Number(rawAmount);
  if (isNaN(amount)) {
    throw new Error('Equity Payload has invalid amount');
  }

  // 4. Extract date
  let transactionDate = new Date();
  const rawDate = data.transactionDate || data.paymentDate;
  if (typeof rawDate === 'string') {
    const parsed = new Date(rawDate);
    if (!isNaN(parsed.getTime())) {
      transactionDate = parsed;
    }
  }

  // 5. Payment method (Equity supports both M-Pesa and Bank Transfers)
  const rawMethod = data.paymentMethod || data.channel;
  let paymentMethod = 'Bank_Transfer';
  if (typeof rawMethod === 'string') {
    const methodLower = rawMethod.toLowerCase();
    if (methodLower.includes('mpesa') || methodLower.includes('m-pesa')) {
      paymentMethod = 'M_Pesa';
    }
  }

  return {
    bank_reference: bankRef,
    church_code: churchCode.toUpperCase().trim(),
    amount: amount,
    currency: 'KES',
    payment_method: paymentMethod,
    transaction_date: transactionDate,
  };
}