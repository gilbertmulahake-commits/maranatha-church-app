import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { LocalChurchStats } from '@/lib/actions/local-actions'
import { Receipt } from 'lucide-react'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount)
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(dateString))
}

export function LocalPaymentHistory({ payments }: { payments: LocalChurchStats['payments'] }) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-muted-foreground" /> Payment History
        </CardTitle>
        <CardDescription>
          A complete record of all contributions received.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="rounded-b-xl overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="text-paragraph-small">Date</TableHead>
                <TableHead className="text-paragraph-small">Transaction ID</TableHead>
                <TableHead className="text-paragraph-small text-center">Type</TableHead>
                <TableHead className="text-paragraph-small text-center">Method</TableHead>
                <TableHead className="text-right text-paragraph-small">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-paragraph-small text-muted-foreground">
                    No payments recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((p) => (
                  <TableRow key={p.id} className="hover:bg-muted/50">
                    <TableCell className="text-paragraph-small text-muted-foreground">
                      {formatDate(p.payment_date)}
                    </TableCell>
                    <TableCell className="font-mono text-paragraph-small text-muted-foreground">
                      {p.transaction_id}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={p.payment_type === 'Annual' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}>
                        {p.payment_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-paragraph-small text-muted-foreground">
                      {p.payment_method === 'M_Pesa' ? 'M-Pesa' : p.payment_method === 'Bank_Transfer' ? 'Bank' : 'Cash'}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-emerald-600 text-paragraph-small">
                      {formatCurrency(p.amount_paid)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}