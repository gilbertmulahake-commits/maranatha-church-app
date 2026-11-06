'use client'

import { useState } from 'react'
import { AppShell } from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function MockKCBPage() {
  const [churchCode, setChurchCode] = useState('')
  const [amount, setAmount] = useState('')
  const [phone, setPhone] = useState('')
  const [paymentType, setPaymentType] = useState('Monthly')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<{ type: 'success' | 'error', text: string } | null>(null)

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
        setResponse({ type: 'success', text: data.message + ` (Church: ${data.church_name})` })
        setChurchCode('')
        setAmount('')
        setPhone('')
        setPaymentType('Monthly')
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
    <AppShell>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mock KCB Simulator</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Simulate an incoming M-Pesa payment from KCB to test the reconciliation engine.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Simulate Payment</CardTitle>
            <CardDescription>
              Enter the church ID and amount. The system will send a webhook to the backend.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Church ID (BillRefNumber)</label>
                <Input 
                  value={churchCode} 
                  onChange={(e) => setChurchCode(e.target.value)} 
                  placeholder="e.g., CH001" 
                  className="h-9"
                  required 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Payment Type</label>
                <select
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-border bg-card px-3 py-1 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="Monthly">Monthly (500)</option>
                  <option value="Annual">Annual (5000)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Amount (KES)</label>
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
                <label className="block text-sm font-medium text-foreground mb-1">Phone Number (MSISDN)</label>
                <Input 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  placeholder="e.g., 0712345678" 
                  className="h-9"
                  required 
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-9">
                {loading ? 'Sending Webhook...' : 'Simulate Payment'}
              </Button>
            </form>

            {response && (
              <div className={`mt-4 p-4 rounded-md border ${
                response.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}>
                <p className="text-sm font-medium">{response.text}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}