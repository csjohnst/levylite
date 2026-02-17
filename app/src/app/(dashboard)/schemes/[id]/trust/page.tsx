import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Plus, CheckCircle2, ArrowUpRight, ArrowDownRight, TrendingUp, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TransactionFilters } from '@/components/trust/transaction-filters'

function formatCurrency(amount: number): string {
  return '$' + amount.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

const TYPE_STYLES: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
  receipt: { variant: 'default', label: 'Receipt' },
  payment: { variant: 'destructive', label: 'Payment' },
  journal: { variant: 'outline', label: 'Journal' },
}

const FUND_LABELS: Record<string, string> = {
  admin: 'Admin',
  capital_works: 'Capital Works',
}

const METHOD_LABELS: Record<string, string> = {
  eft: 'EFT',
  credit_card: 'Credit Card',
  cheque: 'Cheque',
  cash: 'Cash',
  bpay: 'BPAY',
}

export default async function TransactionListPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ type?: string; fund?: string; from?: string; to?: string; reconciled?: string }>
}) {
  const { id } = await params
  const filters = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: scheme } = await supabase
    .from('schemes')
    .select('id, scheme_name, scheme_number')
    .eq('id', id)
    .single()

  if (!scheme) notFound()

  // Build query with filters
  let query = supabase
    .from('transactions')
    .select(`
      *,
      chart_of_accounts:category_id(id, code, name),
      lots:lot_id(id, lot_number, unit_number)
    `)
    .eq('scheme_id', id)
    .is('deleted_at', null)
    .order('transaction_date', { ascending: false })

  if (filters.type && filters.type !== 'all') {
    query = query.eq('transaction_type', filters.type)
  }
  if (filters.fund && filters.fund !== 'all') {
    query = query.eq('fund_type', filters.fund)
  }
  if (filters.from) {
    query = query.gte('transaction_date', filters.from)
  }
  if (filters.to) {
    query = query.lte('transaction_date', filters.to)
  }
  if (filters.reconciled === 'yes') {
    query = query.eq('is_reconciled', true)
  } else if (filters.reconciled === 'no') {
    query = query.eq('is_reconciled', false)
  }

  const { data: transactions } = await query

  const txnList = (transactions ?? []) as Array<{
    id: string
    transaction_date: string
    transaction_type: string
    fund_type: string
    amount: number
    gst_amount: number
    description: string | null
    reference: string | null
    payment_method: string | null
    is_reconciled: boolean
    chart_of_accounts: { id: string; code: string; name: string } | null
    lots: { id: string; lot_number: string; unit_number: string | null } | null
  }>

  // Summary stats
  const totalReceipts = txnList
    .filter(t => t.transaction_type === 'receipt')
    .reduce((sum, t) => sum + t.amount, 0)
  const totalPayments = txnList
    .filter(t => t.transaction_type === 'payment')
    .reduce((sum, t) => sum + t.amount, 0)
  const netMovement = totalReceipts - totalPayments
  const unreconciledCount = txnList.filter(t => !t.is_reconciled).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Trust Accounting</h2>
          <p className="text-muted-foreground">
            <Link href={`/schemes/${id}`} className="hover:underline">{scheme.scheme_name}</Link>
            {' '}&mdash; Ledger
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/schemes/${id}/trust/accounts`}>
              <BookOpen className="mr-2 size-4" />
              Chart of Accounts
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/schemes/${id}/trust/new`}>
              <Plus className="mr-2 size-4" />
              Record Transaction
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Total Receipts</CardDescription>
            <ArrowUpRight className="size-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <CardTitle className="text-2xl text-green-700">{formatCurrency(totalReceipts)}</CardTitle>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Total Payments</CardDescription>
            <ArrowDownRight className="size-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <CardTitle className="text-2xl text-red-700">{formatCurrency(totalPayments)}</CardTitle>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Net Movement</CardDescription>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <CardTitle className={`text-2xl ${netMovement >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {netMovement >= 0 ? '+' : ''}{formatCurrency(netMovement)}
            </CardTitle>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Unreconciled</CardDescription>
            <CheckCircle2 className={`size-4 ${unreconciledCount > 0 ? 'text-amber-500' : 'text-green-500'}`} />
          </CardHeader>
          <CardContent>
            <CardTitle className="text-2xl">{unreconciledCount}</CardTitle>
            <p className="text-xs text-muted-foreground">transaction{unreconciledCount !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionFilters schemeId={id} />
        </CardContent>
      </Card>

      {/* Transactions table */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <CardDescription>
            {txnList.length > 0
              ? `${txnList.length} transaction${txnList.length !== 1 ? 's' : ''}`
              : 'No transactions recorded yet'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {txnList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No transactions match your filters.</p>
              <Button asChild className="mt-4">
                <Link href={`/schemes/${id}/trust/new`}>
                  <Plus className="mr-2 size-4" />
                  Record First Transaction
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Fund</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-[40px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {txnList.map(txn => {
                  const typeStyle = TYPE_STYLES[txn.transaction_type] ?? TYPE_STYLES.journal
                  const isReceipt = txn.transaction_type === 'receipt'

                  return (
                    <TableRow key={txn.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(txn.transaction_date)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={typeStyle.variant} className="text-xs">
                          {typeStyle.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">{txn.description || '-'}</span>
                          {txn.reference && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              Ref: {txn.reference}
                            </span>
                          )}
                        </div>
                        {txn.lots && (
                          <span className="text-xs text-muted-foreground">
                            Lot {txn.lots.lot_number}
                            {txn.lots.unit_number && ` (${txn.lots.unit_number})`}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {txn.chart_of_accounts ? (
                          <span>
                            <span className="font-mono text-xs text-muted-foreground mr-1">
                              {txn.chart_of_accounts.code}
                            </span>
                            {txn.chart_of_accounts.name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {FUND_LABELS[txn.fund_type] ?? txn.fund_type}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-medium ${isReceipt ? 'text-green-700' : txn.transaction_type === 'payment' ? 'text-red-700' : ''}`}>
                        {isReceipt ? '+' : txn.transaction_type === 'payment' ? '-' : ''}
                        {formatCurrency(txn.amount)}
                      </TableCell>
                      <TableCell>
                        {txn.is_reconciled ? (
                          <CheckCircle2 className="size-4 text-green-500" />
                        ) : (
                          <div className="size-4 rounded-full border-2 border-muted-foreground/30" />
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
