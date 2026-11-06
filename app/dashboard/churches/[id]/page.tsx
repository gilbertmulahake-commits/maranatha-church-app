import { Suspense } from 'react'
import { connection } from 'next/server'
import { AppShell } from '@/components/layout/app-shell'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Phone, FileText } from 'lucide-react'

async function ChurchProfileContent({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const church = await prisma.church.findUnique({
    where: { id: resolvedParams.id },
    include: {
      region: true,
      payments: {
        orderBy: { payment_date: 'desc' },
        take: 10,
      },
    },
  })

  if (!church) return notFound()

  const totalPaid = church.payments.reduce((sum, p) => sum + Number(p.amount_paid), 0)
  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount)

  return (
    <div className="space-y-xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-2 font-medium text-foreground">{church.church_name}</h1>
          <p className="mt-xs text-paragraph-small text-muted-foreground">{church.church_code} &middot; {church.region?.name || 'Unassigned'}</p>
        </div>
        <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">Active</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-md">
        <Card>
          <CardHeader>
            <CardDescription>Total Collected</CardDescription>
            <CardTitle className="text-heading-2 font-bold text-emerald-600 tabular-nums">{formatCurrency(totalPaid)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-1.5 w-full rounded-full bg-muted">
              <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: '50%' }} />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Leadership</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-md">
            <div>
              <p className="text-paragraph-mini text-muted-foreground">Pastor</p>
              <p className="font-medium text-foreground text-paragraph-small">{church.pastor_name}</p>
              <a href={`tel:${church.pastor_phone}`} className="text-paragraph-mini text-primary hover:underline flex items-center gap-xs mt-xs">
                <Phone className="h-3 w-3"/> {church.pastor_phone}
              </a>
            </div>
            <div>
              <p className="text-paragraph-mini text-muted-foreground">Treasurer</p>
              <p className="font-medium text-foreground text-paragraph-small">{church.treasurer_name}</p>
              <a href={`tel:${church.contact_phone}`} className="text-paragraph-mini text-primary hover:underline flex items-center gap-xs mt-xs">
                <Phone className="h-3 w-3"/> {church.contact_phone}
              </a>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-xl border-b border-border">
          <h3 className="text-heading-4 font-medium text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4" /> Recent Payments
          </h3>
          <p className="text-paragraph-small text-muted-foreground">Last 10 transactions</p>
        </div>
        <div className="p-xl text-center text-paragraph-small text-muted-foreground">
          Full transaction history coming in the next update.
        </div>
      </div>
    </div>
  )
}

async function Content({ params }: { params: Promise<{ id: string }> }) {
  // Force dynamic rendering (auth-protected route)
  await connection()

  return (
    <AppShell>
      <Suspense fallback={<div className="p-xl text-muted-foreground">Loading church profile...</div>}>
        <ChurchProfileContent params={params} />
      </Suspense>
    </AppShell>
  )
}

export default function ChurchProfilePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="p-xl text-muted-foreground">Loading...</div>}>
      <Content params={params} />
    </Suspense>
  )
}