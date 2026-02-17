import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  Receipt,
  DollarSign,
  AlertTriangle,
  CreditCard,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { LotSelector } from '@/components/owner/lot-selector'

function formatCurrency(amount: number): string {
  return '$' + amount.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const STATUS_BADGES: Record<string, { className: string; label: string }> = {
  paid: { className: 'bg-green-100 text-green-800', label: 'Paid' },
  partial: { className: 'bg-amber-100 text-amber-800', label: 'Partial' },
  overdue: { className: 'bg-red-100 text-red-800', label: 'Overdue' },
  pending: { className: 'bg-gray-100 text-gray-800', label: 'Pending' },
  sent: { className: 'bg-blue-100 text-blue-800', label: 'Sent' },
}

export default async function OwnerLeviesPage({
  searchParams,
}: {
  searchParams: Promise<{ lot?: string }>
}) {
  const params = await searchParams
  const selectedLotId = params.lot ?? null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/owner/login')

  // Get owner record
  const { data: owner } = await supabase
    .from('owners')
    .select('id')
    .eq('portal_user_id', user.id)
    .single()

  if (!owner) redirect('/owner/login')

  // Get owner's lots
  const { data: ownerships } = await supabase
    .from('lot_ownerships')
    .select(`
      lot_id,
      lots(
        id, lot_number, unit_number,
        schemes(id, scheme_name, trust_bsb, trust_account_number, trust_account_name)
      )
    `)
    .eq('owner_id', owner.id)
    .is('ownership_end_date', null)

  const lotInfos = (ownerships ?? []).map((o) => {
    const lot = o.lots as unknown as {
      id: string
      lot_number: string
      unit_number: string | null
      schemes: { id: string; scheme_name: string; trust_bsb: string | null; trust_account_number: string | null; trust_account_name: string | null }
    }
    return {
      lot_id: o.lot_id,
      lot_number: lot.lot_number,
      unit_number: lot.unit_number,
      scheme_name: lot.schemes?.scheme_name ?? 'Unknown',
      trust_bsb: lot.schemes?.trust_bsb,
      trust_account_number: lot.schemes?.trust_account_number,
      trust_account_name: lot.schemes?.trust_account_name,
    }
  })

  const lotIds = selectedLotId
    ? lotInfos.filter((l) => l.lot_id === selectedLotId).map((l) => l.lot_id)
    : lotInfos.map((l) => l.lot_id)

  // Fetch levy items for selected lots
  const { data: levyItems } = lotIds.length > 0
    ? await supabase
        .from('levy_items')
        .select('id, lot_id, total_levy_amount, amount_paid, balance, status, due_date, levy_type')
        .in('lot_id', lotIds)
        .order('due_date', { ascending: false })
    : { data: [] }

  const items = levyItems ?? []

  // Calculate summaries
  const currentBalance = items.reduce((sum, i) => sum + Number(i.balance), 0)
  const overdueAmount = items
    .filter((i) => i.status === 'overdue')
    .reduce((sum, i) => sum + Number(i.balance), 0)

  // Get most recent payment
  const { data: lastPayments } = lotIds.length > 0
    ? await supabase
        .from('payments')
        .select('amount, payment_date')
        .in('lot_id', lotIds)
        .order('payment_date', { ascending: false })
        .limit(1)
    : { data: [] }

  const lastPayment = lastPayments?.[0] ?? null

  // Get trust account info from first lot's scheme
  const activeLot = selectedLotId
    ? lotInfos.find((l) => l.lot_id === selectedLotId)
    : lotInfos[0]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Levy Statements</h2>
          <p className="text-muted-foreground">Your levy history and payment status</p>
        </div>
        {lotInfos.length > 1 && (
          <LotSelector lots={lotInfos} />
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Current Balance</CardDescription>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <CardTitle className={`text-2xl ${currentBalance > 0 ? 'text-red-600' : ''}`}>
              {formatCurrency(currentBalance)}
            </CardTitle>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Overdue Amount</CardDescription>
            <AlertTriangle className={`size-4 ${overdueAmount > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <CardTitle className={`text-2xl ${overdueAmount > 0 ? 'text-red-600' : ''}`}>
              {formatCurrency(overdueAmount)}
            </CardTitle>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Last Payment</CardDescription>
            <CreditCard className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {lastPayment ? (
              <>
                <CardTitle className="text-2xl">{formatCurrency(Number(lastPayment.amount))}</CardTitle>
                <p className="text-xs text-muted-foreground">{formatDate(lastPayment.payment_date)}</p>
              </>
            ) : (
              <CardTitle className="text-2xl text-muted-foreground">--</CardTitle>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment Instructions */}
      {activeLot?.trust_bsb && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment Instructions</CardTitle>
            <CardDescription>Bank transfer details for levy payments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Account Name</p>
                <p className="text-sm font-medium">{activeLot.trust_account_name ?? '--'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">BSB</p>
                <p className="text-sm font-medium">{activeLot.trust_bsb}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Account Number</p>
                <p className="text-sm font-medium">{activeLot.trust_account_number ?? '--'}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Please use your lot number as the payment reference.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Levy History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="size-4" />
            Levy History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {items.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {lotInfos.length > 1 && !selectedLotId && <TableHead>Lot</TableHead>}
                    <TableHead>Description</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Amount Due</TableHead>
                    <TableHead className="text-right">Amount Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const badge = STATUS_BADGES[item.status] ?? STATUS_BADGES.pending
                    const lot = lotInfos.find((l) => l.lot_id === item.lot_id)
                    return (
                      <TableRow key={item.id}>
                        {lotInfos.length > 1 && !selectedLotId && (
                          <TableCell className="text-sm">
                            Lot {lot?.lot_number}
                          </TableCell>
                        )}
                        <TableCell className="text-sm font-medium capitalize">
                          {item.levy_type === 'special' ? 'Special Levy' : 'Levy'}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {formatDate(item.due_date)}
                        </TableCell>
                        <TableCell className="text-sm text-right">
                          {formatCurrency(Number(item.total_levy_amount))}
                        </TableCell>
                        <TableCell className="text-sm text-right">
                          {formatCurrency(Number(item.amount_paid))}
                        </TableCell>
                        <TableCell className={`text-sm text-right font-medium ${Number(item.balance) > 0 ? 'text-red-600' : ''}`}>
                          {formatCurrency(Number(item.balance))}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={badge.className}>
                            {badge.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Receipt className="size-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No levy items</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                No levy items found for your lots.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
