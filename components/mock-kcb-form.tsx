'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Lock } from 'lucide-react'

export function MockKCBForm({
  userRole,
  lockedChurchCode,
}: {
  userRole: string
  lockedChurchCode: string | null
}) {
  const [churchCode, setChurchCode] = useState(lockedChurchCode || '')
  const [amount, setAmount] = useState('')
  const [phone, setPhone] = useState('')
  const [paymentType, setPaymentType] = useState('Monthly')
  const [billingYear, setBillingYear] = useState(new Date().getFullYear().toString())
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const isLocked = !!lockedChurchCode

  useEffect(() => {
    if (lockedChurchCode) {
      setChurchCode(lockedChurchCode)
    }
  }, [lockedChurchCode])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setResponse(null)

    const transID = `MOCK${Math.random().toString(36).substring(2, 10).toUpperCase()}`

    const payload = {
      TransID: transID,
      TransAmount: amount,
      BillRefNumber: churchCode.toUpperCase(),
      MSISDN: phone,
      TransTime: new Date().toISOString(),
      FirstName: 'Test Payer',
      payment_type: paymentType,
    }

    try {
      const res = await fetch('/api/webhooks/kcb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (res.ok) {
        setResponse({
          type: 'success',
          text: `${data.message} (Church: ${data.church_name}, ${data.allocations_count} allocations)`,
        })
        if (!isLocked) setChurchCode('')
        setAmount('')
        setPhone('')
        setPaymentType('Monthly')
        setBillingYear(new Date().getFullYear().toString())
      } else {
        setResponse({ type: 'error', text: data.error || 'Failed to process payment' })
      }
    } catch (error) {
      setResponse({ type: 'error', text: 'Network error occurred.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-xl" style={{ width: '100%', maxWidth: '42rem' }}>
      <Card>
        <CardHeader>
          <CardTitle>Simulate Payment</CardTitle>
          <CardDescription>
            {isLocked
              ? `You are simulating a payment for your assigned church (${lockedChurchCode}).`
              : 'Enter any church ID and amount. The system will send a webhook to the backend.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-md">
            <div>
              <label className="block text-paragraph-small font-medium text-foreground mb-xs flex items-center justify-between">
                <span>Church ID (BillRefNumber)</span>
                {isLocked && (
                  <span className="text-primary text-[10px] flex items-center">
                    <Lock className="h-3 w-3 mr-1" /> Locked to your church
                  </span>
                )}
              </label>
              <Input
                value={churchCode}
                onChange={(e) => setChurchCode(e.target.value)}
                placeholder="e.g., CH001"
                className={`h-9 ${isLocked ? 'bg-muted text-muted-foreground cursor-not-allowed' : ''}`}
                disabled={isLocked}
                required
              />
            </div>

            <div>
              <label className="block text-paragraph-small font-medium text-foreground mb-xs">
                Payment Type
              </label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value)}
                className="flex h-9 w-full rounded-md border border-border bg-card px-3 py-1 text-paragraph-small text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="Monthly">Monthly (500)</option>
                <option value="Annual">Annual (5000)</option>
                <option value="Auto">Auto — Split by Annual Priority</option>
              </select>
              {paymentType === 'Auto' && (
                <p className="text-paragraph-mini text-muted-foreground mt-xs">
                  System will apply the amount to Annual arrears first, then Monthly, then future months.
                </p>
              )}
            </div>

            <div>
              <label className="block text-paragraph-small font-medium text-foreground mb-xs">
                Billing Year
              </label>
              <Input
                type="number"
                value={billingYear}
                onChange={(e) => setBillingYear(e.target.value)}
                placeholder="e.g., 2026"
                className="h-9"
                required
              />
              <p className="text-paragraph-mini text-muted-foreground mt-xs">
                Simulate a payment for a past year to test carry-forward arrears.
              </p>
            </div>

            <div>
              <label className="block text-paragraph-small font-medium text-foreground mb-xs">
                Amount (KES)
              </label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g., 5000"
                className="h-9"
                required
              />
            </div>

            <div>
              <label className="block text-paragraph-small font-medium text-foreground mb-xs">
                Phone Number (MSISDN)
              </label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g., 0712345678"
                className="h-9"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-9"
            >
              {loading ? 'Sending Webhook...' : 'Simulate Payment'}
            </Button>
          </form>

          {response && (
            <div
              className={`mt-md p-md rounded-md border ${
                response.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}
            >
              <p className="text-paragraph-small font-medium">{response.text}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}