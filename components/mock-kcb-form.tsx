'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function MockKcbForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [churchId, setChurchId] = useState('CH001')
  const [amount, setAmount] = useState('5000')
  const [phone, setPhone] = useState('0712345678')
  const [paymentType, setPaymentType] = useState('Auto')
  const [billingYear, setBillingYear] = useState(new Date().getFullYear().toString())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/webhooks/kcb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          TransID: `MOCK-${Date.now()}`,
          BillRefNumber: churchId,
          TransAmount: Number(amount),
          MSISDN: phone,
          TransTime: new Date().toISOString(),
          payment_type: paymentType, // Fixed casing
          billing_year: Number(billingYear), // Fixed casing
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process mock payment')
      }

      toast.success('Payment simulated successfully')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-xl items-start w-full">
      {/* Left Column: The Form */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-heading-4 font-bold text-foreground">Simulate KCB Payment</CardTitle>
          <CardDescription>
            Trigger a mock IPN webhook to test the reconciliation and allocation engine.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-md">
            <div className="space-y-sm">
              <Label htmlFor="churchId">Church ID (BillRefNumber)</Label>
              <Input 
                id="churchId" 
                value={churchId} 
                onChange={(e) => setChurchId(e.target.value)} 
                placeholder="e.g. CH001" 
                required 
              />
            </div>

            <div className="space-y-sm">
              <Label htmlFor="amount">Amount (KES)</Label>
              <Input 
                id="amount" 
                type="number" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)} 
                placeholder="e.g. 5000" 
                required 
              />
            </div>

            <div className="space-y-sm">
              <Label htmlFor="phone">Phone Number (MSISDN)</Label>
              <Input 
                id="phone" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                placeholder="e.g. 0712345678" 
                required 
              />
            </div>

            <div className="grid grid-cols-2 gap-md">
              <div className="space-y-sm">
                <Label htmlFor="paymentType">Payment Type</Label>
                <Select value={paymentType} onValueChange={(val) => setPaymentType(val || 'Auto')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Auto">Auto (Smart Split)</SelectItem>
                    <SelectItem value="Annual">Annual</SelectItem>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-sm">
                <Label htmlFor="billingYear">Billing Year</Label>
                <Input 
                  id="billingYear" 
                  type="number" 
                  value={billingYear} 
                  onChange={(e) => setBillingYear(e.target.value)} 
                  required 
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Send Mock Webhook
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Right Column: Testing Guide */}
      <Card className="bg-muted/30 border-dashed w-full">
        <CardHeader>
          <div className="flex items-center gap-sm">
            <HelpCircle className="h-5 w-5 text-primary" />
            <CardTitle className="text-heading-3 font-bold text-foreground">Testing Guide</CardTitle>
          </div>
          <CardDescription>
            Use this simulator to test the allocation engine.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-lg text-paragraph-small">
          <div>
            <h4 className="font-medium text-foreground mb-xs flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Payment Priorities (Auto Mode)
            </h4>
            <p className="text-muted-foreground mb-sm">
              When you select <strong>"Auto"</strong>, the allocation engine splits a single lump sum using this exact priority FIFO model:
            </p>
            <ol className="list-decimal pl-5 space-y-1.5 text-muted-foreground">
              <li>Past-year Annual arrears</li>
              <li>Past-year Monthly arrears</li>
              <li>Current-year Annual</li>
              <li>Current-year Monthly arrears</li>
              <li>Remaining months of Current Year</li>
              <li>Future Years (Annual, then Monthly)</li>
            </ol>
          </div>
          
          <div className="pt-md border-t border-border">
            <h4 className="font-medium text-foreground mb-xs">Try a mixed deposit</h4>
            <p className="text-muted-foreground mb-sm">
              Send <strong>KES 20,000</strong> with <strong>"Auto"</strong> selected. 
              The system will automatically pay off all arrears, cover the current year, and allocate the remaining funds to future prepayments.
            </p>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline" className="text-xs">1 Payment Record</Badge>
              <Badge variant="outline" className="text-xs">Multiple Allocations</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}