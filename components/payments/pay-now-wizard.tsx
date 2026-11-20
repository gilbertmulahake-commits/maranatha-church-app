'use client'

import { useEffect, useMemo, useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import {
  PAYMENT_INTENT_AMOUNT_CEILING,
  PAYMENT_INTENT_POLL_INTERVAL_MS,
} from '@/lib/constants'
import {
  abandonPaymentIntent,
  createPaymentIntent,
  pollPaymentIntent,
} from '@/lib/actions/payment-intent-actions'
import { LocalChurchStats } from '@/lib/actions/local-actions'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { TableShell } from '@/components/ui/table-shell'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { WizardStepIndicator } from './wizard-step-indicator'
import { toast } from 'sonner'
import { AlertCircle, CheckCircle2, Clock, Copy, Loader2, XCircle } from 'lucide-react'

type Step = 1 | 2 | 3 | 4 | 5
type Bucket = 'Annual' | 'Monthly'
type Result =
  | {
      kind: 'Matched'
      payment: {
        transactionId: string
        amount: number
        allocations: { type: string; year: number; month: number | null; amount: number }[]
      }
    }
  | { kind: 'Unmatched' }
  | { kind: 'Failed'; reason: string }
  | { kind: 'Expired' }

const STEP_LABELS = ['Bucket', 'Amount', 'Method', 'Pay', 'Done']
const MPESA_PAYBILL = process.env.NEXT_PUBLIC_MPESA_PAYBILL_NUMBER ?? ''

function statusPillClasses(status: string): string {
  if (status === 'Paid') return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  if (status === 'Partial') return 'bg-amber-100 text-amber-700 border-amber-200'
  if (status === 'Overdue') return 'bg-red-100 text-red-700 border-red-200'
  return 'bg-gray-100 text-gray-700 border-gray-200'
}

function bucketPriority(status: string, outstanding: number): number {
  const statusRank =
    status === 'Overdue' ? 0 : status === 'Partial' ? 1 : status === 'Paid' ? 2 : 3
  return statusRank * 1_000_000 - outstanding
}

function copyText(text: string) {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return
  navigator.clipboard.writeText(text).then(() => toast.success('Copied'))
}

type Props = {
  stats: LocalChurchStats
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PayNowWizard({ stats, open, onOpenChange }: Props) {
  const [step, setStep] = useState<Step>(1)
  const [bucket, setBucket] = useState<Bucket | null>(null)
  const [amount, setAmount] = useState('')
  const [intentId, setIntentId] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<Date | null>(null)
  const [pollingActive, setPollingActive] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())

  // Countdown tick — interval callback does the setState, not the effect body.
  useEffect(() => {
    if (!expiresAt || step !== 4) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [expiresAt, step])

  // Polling — active only after "I have paid" click.
  useEffect(() => {
    if (!pollingActive || !intentId) return
    let cancelled = false
    const tick = async () => {
      const r = await pollPaymentIntent(intentId)
      if (cancelled || 'error' in r) return
      if (r.status === 'Matched') {
        setResult({ kind: 'Matched', payment: r.payment })
        setStep(5)
      } else if (r.status === 'Unmatched') {
        setResult({ kind: 'Unmatched' })
        setStep(5)
      } else if (r.status === 'Expired') {
        setResult({ kind: 'Expired' })
        setStep(5)
      }
    }
    const id = setInterval(tick, PAYMENT_INTENT_POLL_INTERVAL_MS)
    tick()
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [pollingActive, intentId])

  const sortedBuckets = useMemo(() => {
    const list = [
      { type: 'Annual' as const, status: stats.annualStatus, outstanding: stats.annualOutstanding },
      { type: 'Monthly' as const, status: stats.monthlyStatus, outstanding: stats.monthlyOutstanding },
    ]
    return list.sort(
      (a, b) => bucketPriority(a.status, a.outstanding) - bucketPriority(b.status, b.outstanding)
    )
  }, [stats])

  const recommendedBucket = sortedBuckets[0]?.type
  const currentOutstanding =
    bucket === 'Annual' ? stats.annualOutstanding : stats.monthlyOutstanding

  function handleBucketContinue() {
    if (!bucket) return
    setAmount(currentOutstanding > 0 ? String(currentOutstanding) : '')
    setStep(2)
    setError(null)
  }

  async function handleAmountContinue() {
    const parsed = parseFloat(amount)
    if (!parsed || parsed <= 0) {
      setError('Amount must be greater than zero')
      return
    }
    if (parsed > PAYMENT_INTENT_AMOUNT_CEILING) {
      setError('Amount exceeds the maximum permitted')
      return
    }
    if (!bucket) return

    setIsLoading(true)
    setError(null)
    const formData = new FormData()
    formData.set('churchId', stats.churchId)
    formData.set('amount', String(parsed))
    formData.set('paymentType', bucket)
    formData.set('rawBillRef', stats.churchCode)

    const r = await createPaymentIntent(formData)
    setIsLoading(false)

    if ('error' in r) {
      setError(r.error)
      return
    }

    setIntentId(r.intentId)
    setExpiresAt(new Date(r.expiresAt))
    // 19b: STK Push not yet implemented — skip step 3 entirely
    setStep(4)
  }

  async function handleCancel() {
    if (intentId) await abandonPaymentIntent(intentId)
    onOpenChange(false)
  }

  const secondsLeft = expiresAt
    ? Math.max(0, Math.floor((expiresAt.getTime() - now) / 1000))
    : 0
  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-full sm:max-w-[600px] p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-heading-2 font-bold tracking-tight">
            Pay Contribution
          </DialogTitle>
          <DialogDescription className="text-paragraph-small text-muted-foreground">
            {stats.churchName} &middot; <span className="font-mono">{stats.churchCode}</span>
          </DialogDescription>
        </DialogHeader>

        <WizardStepIndicator current={step} labels={STEP_LABELS} />

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-paragraph-small text-foreground font-medium">
                Which contribution are you paying?
              </p>
              <p className="text-paragraph-small text-muted-foreground">
                Annual and Monthly are independent ledgers.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
              {sortedBuckets.map((b) => {
                const isSelected = bucket === b.type
                const isRecommended = b.type === recommendedBucket
                return (
                  <button
                    key={b.type}
                    type="button"
                    onClick={() => {
                      setBucket(b.type)
                      setError(null)
                    }}
                    className={`text-left rounded-xl border bg-card p-4 transition-all duration-200 hover:border-primary/60 ${
                      isSelected ? 'border-primary ring-1 ring-primary/30' : 'border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-paragraph-small font-semibold text-foreground">{b.type}</p>
                      {isRecommended && (
                        <Badge
                          variant="outline"
                          className="bg-primary/10 text-primary border-primary/20 text-xs"
                        >
                          Recommended
                        </Badge>
                      )}
                    </div>
                    <p className="mt-2 text-heading-4 font-bold tabular-nums text-foreground">
                      {formatCurrency(b.outstanding)}
                    </p>
                    <div className="mt-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${statusPillClasses(b.status)}`}
                      >
                        {b.status}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>

            {error && <p className="text-paragraph-small text-destructive">{error}</p>}
          </div>
        )}

        {step === 2 && bucket && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{bucket}</Badge>
              <span className="text-paragraph-small text-muted-foreground">
                Outstanding: {formatCurrency(currentOutstanding)}
              </span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wizard-amount" className="text-paragraph-small font-medium text-foreground">
                Amount (KES)
              </Label>
              <Input
                id="wizard-amount"
                type="number"
                inputMode="numeric"
                min="1"
                max={PAYMENT_INTENT_AMOUNT_CEILING}
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value)
                  setError(null)
                }}
                className="bg-card border-border h-9 tabular-nums"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {currentOutstanding > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setAmount(String(currentOutstanding))}
                >
                  Pay full outstanding
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setAmount('500')}
              >
                Pay KES 500
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setAmount('5000')}
              >
                Pay KES 5,000
              </Button>
            </div>

            {error && <p className="text-paragraph-small text-destructive">{error}</p>}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="text-paragraph-small text-muted-foreground">
              Payment method selection will appear here in a future update.
            </p>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-paragraph-small font-medium text-foreground">
                Pay {formatCurrency(parseFloat(amount) || 0)} for {bucket}
              </p>
              <p className="text-xs text-muted-foreground tabular-nums font-mono">
                Expires in {minutes}:{String(seconds).padStart(2, '0')}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <p className="text-paragraph-small font-semibold text-foreground">M-Pesa App</p>
              <ol className="space-y-2 text-paragraph-small">
                <li>1. Open M-Pesa app</li>
                <li>2. Lipa na M-Pesa &rarr; Pay Bill</li>
                <li className="flex items-center gap-2 flex-wrap">
                  <span>3. Business Number:</span>
                  <span className="font-mono text-foreground">{MPESA_PAYBILL || '—'}</span>
                  {MPESA_PAYBILL && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => copyText(MPESA_PAYBILL)}
                    >
                      <Copy className="h-3 w-3 mr-1" /> Copy
                    </Button>
                  )}
                </li>
                <li className="flex items-center gap-2 flex-wrap">
                  <span>4. Account Number:</span>
                  <span className="font-mono text-foreground">{stats.churchCode}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => copyText(stats.churchCode)}
                  >
                    <Copy className="h-3 w-3 mr-1" /> Copy
                  </Button>
                </li>
                <li className="flex items-center gap-2 flex-wrap">
                  <span>5. Amount:</span>
                  <span className="font-mono tabular-nums text-foreground">
                    {formatCurrency(parseFloat(amount) || 0)}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => copyText(String(parseFloat(amount) || 0))}
                  >
                    <Copy className="h-3 w-3 mr-1" /> Copy
                  </Button>
                </li>
                <li>6. Enter your PIN to confirm</li>
              </ol>
            </div>

            {pollingActive && (
              <div className="flex items-center gap-2 rounded-lg bg-muted/30 p-3">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <p className="text-paragraph-small text-muted-foreground">
                  Waiting for payment confirmation&hellip;
                </p>
              </div>
            )}

            {error && <p className="text-paragraph-small text-destructive">{error}</p>}
          </div>
        )}

        {step === 5 && result && (
          <div className="space-y-4">
            {result.kind === 'Matched' && (
              <>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-heading-4 font-bold text-emerald-600">Payment confirmed</p>
                    <p className="text-paragraph-small text-muted-foreground mt-1">
                      {formatCurrency(result.payment.amount)} received.
                    </p>
                  </div>
                </div>
                <div className="rounded-lg bg-muted/30 p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Receipt</p>
                  <p className="text-paragraph-small font-mono text-foreground">
                    {result.payment.transactionId}
                  </p>
                </div>
                {result.payment.allocations.length > 0 && (
                  <TableShell>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Year</TableHead>
                          <TableHead>Month</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.payment.allocations.map((a, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-paragraph-small">{a.type}</TableCell>
                            <TableCell className="text-paragraph-small tabular-nums">{a.year}</TableCell>
                            <TableCell className="text-paragraph-small">{a.month ?? '—'}</TableCell>
                            <TableCell className="text-paragraph-small text-right font-medium tabular-nums">
                              {formatCurrency(a.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableShell>
                )}
              </>
            )}

            {result.kind === 'Unmatched' && (
              <div className="flex items-start gap-3">
                <AlertCircle className="h-6 w-6 text-amber-600 shrink-0" />
                <div>
                  <p className="text-heading-4 font-bold text-amber-600">
                    Payment received, needs reconciliation
                  </p>
                  <p className="text-paragraph-small text-muted-foreground mt-1">
                    We received a payment matching your amount, but the reference did not resolve
                    to a church. HQ will reconcile it &mdash; you do not need to pay again.
                  </p>
                </div>
              </div>
            )}

            {result.kind === 'Failed' && (
              <div className="flex items-start gap-3">
                <XCircle className="h-6 w-6 text-destructive shrink-0" />
                <div>
                  <p className="text-heading-4 font-bold text-destructive">Payment failed</p>
                  <p className="text-paragraph-small text-muted-foreground mt-1">{result.reason}</p>
                </div>
              </div>
            )}

            {result.kind === 'Expired' && (
              <div className="flex items-start gap-3">
                <Clock className="h-6 w-6 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-heading-4 font-bold text-foreground">Time expired</p>
                  <p className="text-paragraph-small text-muted-foreground mt-1">
                    The payment window has closed. If you did pay, it will still appear in your
                    payment history once the bank confirms it.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="pt-4 gap-2 flex-col-reverse sm:flex-row">
          {step === 1 && (
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleBucketContinue}
                disabled={!bucket}
                className="bg-primary hover:bg-primary/90"
              >
                Continue
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                type="button"
                onClick={handleAmountContinue}
                disabled={isLoading}
                className="bg-primary hover:bg-primary/90"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continue
              </Button>
            </>
          )}

          {step === 4 && !pollingActive && (
            <>
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => setPollingActive(true)}
                className="bg-primary hover:bg-primary/90"
              >
                I have paid
              </Button>
            </>
          )}

          {step === 4 && pollingActive && (
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
          )}

          {step === 5 && (
            <>
              {result?.kind === 'Expired' && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setStep(1)
                    setBucket(null)
                    setAmount('')
                    setIntentId(null)
                    setExpiresAt(null)
                    setPollingActive(false)
                    setResult(null)
                    setError(null)
                  }}
                >
                  Try again
                </Button>
              )}
              <Button
                type="button"
                onClick={() => onOpenChange(false)}
                className="bg-primary hover:bg-primary/90"
              >
                Close
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}