'use client'

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Phone, MapPin, User, Wallet, History } from 'lucide-react'
import type { ChurchRow } from './church-table'
import Link from 'next/link'

export function ViewChurchDialog({ church, onClose }: { church: ChurchRow | null, onClose: () => void }) {
  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount)

  const progressPct = church && church.expected > 0 
    ? Math.min((church.amountPaid / church.expected) * 100, 100) 
    : 0

  return (
    <Dialog open={!!church} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-[500px] p-xl"> 
        {church && (
          <>
            <DialogHeader className="space-y-2xs">
              <div className="flex items-start justify-between pr-6">
                <div>
                  <DialogTitle className="text-heading-3 font-medium">{church.church_name}</DialogTitle>
                  <DialogDescription className="font-mono mt-xs text-paragraph-mini text-muted-foreground">
                    {church.church_code}
                  </DialogDescription>
                </div>
                <Badge variant="outline" className={`mt-1 rounded-full px-2.5 py-0.5 text-paragraph-mini font-medium ${
                  church.status === 'Paid' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                  church.status === 'Partial' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                  'bg-red-100 text-red-700 border-red-200'
                }`}>
                  {church.status}
                </Badge>
              </div>
            </DialogHeader>

            <div className="mt-md rounded-lg border border-border bg-muted/30 p-md">
              <div className="flex items-center justify-between mb-md">
                <div className="flex items-center gap-xs text-paragraph-small font-medium text-foreground">
                  <Wallet className="h-4 w-4 text-muted-foreground" /> Financial Status
                </div>
                <span className="text-paragraph-mini text-muted-foreground">Target: {formatCurrency(church.expected)}</span>
              </div>
              
              <div className="flex justify-between items-end mb-md">
                <div>
                  <p className="text-paragraph-mini text-muted-foreground mb-xs">Amount Paid</p>
                  <p className="text-heading-4 font-semibold text-emerald-600 tabular-nums">{formatCurrency(church.amountPaid)}</p>
                </div>
                <div className="text-right">
                  <p className="text-paragraph-mini text-muted-foreground mb-xs">Outstanding</p>
                  <p className="text-heading-4 font-semibold text-destructive tabular-nums">{formatCurrency(church.outstanding)}</p>
                </div>
              </div>

              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full ${progressPct === 100 ? 'bg-emerald-500' : 'bg-primary'}`} style={{ width: `${progressPct}%` }} />
              </div>
            </div>

            <Separator className="my-md" />

            <div className="space-y-md">
              <div className="grid grid-cols-2 gap-md">
                <div className="space-y-2xs">
                  <div className="flex items-center gap-xs text-paragraph-mini font-medium text-muted-foreground">
                    <User className="h-3 w-3" /> Local Pastor
                  </div>
                  <p className="font-medium text-foreground text-paragraph-small">{church.pastor_name || 'Not Assigned'}</p>
                  <a href={`tel:${church.pastor_phone}`} className="text-paragraph-mini text-primary hover:underline flex items-center gap-xs">
                    <Phone className="h-3 w-3" /> {church.pastor_phone || 'No phone'}
                  </a>
                </div>

                <div className="space-y-2xs">
                  <div className="flex items-center gap-xs text-paragraph-mini font-medium text-muted-foreground">
                    <User className="h-3 w-3" /> Treasurer
                  </div>
                  <p className="font-medium text-foreground text-paragraph-small">{church.treasurer_name || 'Not Assigned'}</p>
                  <a href={`tel:${church.contact_phone}`} className="text-paragraph-mini text-primary hover:underline flex items-center gap-xs">
                    <Phone className="h-3 w-3" /> {church.contact_phone || 'No phone'}
                  </a>
                </div>
              </div>

              <div className="space-y-2xs">
                <div className="flex items-center gap-xs text-paragraph-mini font-medium text-muted-foreground">
                  <MapPin className="h-3 w-3" /> Region Assignment
                </div>
                <p className="text-paragraph-small font-medium text-foreground">{church.region?.name || 'Unassigned'}</p>
              </div>
            </div>

            <DialogFooter className="mt-xl gap-2 sm:gap-0 flex-col-reverse sm:flex-row">
              <Link href={`/dashboard/churches/${church.id}`} passHref>
                <Button variant="outline" className="h-9 w-full sm:w-auto">
                  <History className="mr-2 h-4 w-4" /> View Full Profile
                </Button>
              </Link>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} className="h-9">Close</Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}