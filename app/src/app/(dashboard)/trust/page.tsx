import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ArrowRight, Landmark, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

function formatCurrency(amount: number): string {
  return '$' + amount.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default async function TrustAccountingOverviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch all active schemes
  const { data: schemes } = await supabase
    .from('schemes')
    .select('id, scheme_name, scheme_number, status')
    .eq('status', 'active')
    .order('scheme_name')

  // Fetch all transactions across schemes for summary
  const { data: allTransactions } = await supabase
    .from('transactions')
    .select('scheme_id, transaction_type, fund_type, amount, is_reconciled')
    .is('deleted_at', null)

  const txns = allTransactions ?? []

  // Build per-scheme summaries
  const schemeSummaries = (schemes ?? []).map(scheme => {
    const schemeTxns = txns.filter(t => t.scheme_id === scheme.id)
    const adminReceipts = schemeTxns
      .filter(t => t.transaction_type === 'receipt' && t.fund_type === 'admin')
      .reduce((sum, t) => sum + t.amount, 0)
    const adminPayments = schemeTxns
      .filter(t => t.transaction_type === 'payment' && t.fund_type === 'admin')
      .reduce((sum, t) => sum + t.amount, 0)
    const cwReceipts = schemeTxns
      .filter(t => t.transaction_type === 'receipt' && t.fund_type === 'capital_works')
      .reduce((sum, t) => sum + t.amount, 0)
    const cwPayments = schemeTxns
      .filter(t => t.transaction_type === 'payment' && t.fund_type === 'capital_works')
      .reduce((sum, t) => sum + t.amount, 0)
    const unreconciledCount = schemeTxns.filter(t => !t.is_reconciled).length

    return {
      ...scheme,
      adminBalance: adminReceipts - adminPayments,
      cwBalance: cwReceipts - cwPayments,
      transactionCount: schemeTxns.length,
      unreconciledCount,
    }
  })

  // Totals
  const totalAdminBalance = schemeSummaries.reduce((sum, s) => sum + s.adminBalance, 0)
  const totalCwBalance = schemeSummaries.reduce((sum, s) => sum + s.cwBalance, 0)
  const totalUnreconciled = schemeSummaries.reduce((sum, s) => sum + s.unreconciledCount, 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Trust Accounting</h2>
        <p className="text-muted-foreground">
          Overview of fund balances across all schemes.
        </p>
      </div>

      {/* Global summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Admin Fund Balance</CardDescription>
            <Landmark className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <CardTitle className="text-2xl">{formatCurrency(totalAdminBalance)}</CardTitle>
            <p className="text-xs text-muted-foreground">Across all schemes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Capital Works Balance</CardDescription>
            <Landmark className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <CardTitle className="text-2xl">{formatCurrency(totalCwBalance)}</CardTitle>
            <p className="text-xs text-muted-foreground">Across all schemes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Unreconciled</CardDescription>
            <CheckCircle2 className={`size-4 ${totalUnreconciled > 0 ? 'text-amber-500' : 'text-green-500'}`} />
          </CardHeader>
          <CardContent>
            <CardTitle className="text-2xl">{totalUnreconciled}</CardTitle>
            <p className="text-xs text-muted-foreground">transaction{totalUnreconciled !== 1 ? 's' : ''} across all schemes</p>
          </CardContent>
        </Card>
      </div>

      {/* Per-scheme cards */}
      {schemeSummaries.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {schemeSummaries.map(scheme => (
            <Card key={scheme.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{scheme.scheme_name}</CardTitle>
                    <CardDescription>{scheme.scheme_number}</CardDescription>
                  </div>
                  {scheme.unreconciledCount > 0 && (
                    <Badge variant="outline" className="text-amber-600 border-amber-300">
                      {scheme.unreconciledCount} unreconciled
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <p className="text-muted-foreground">Admin Fund</p>
                    <p className="text-lg font-semibold">{formatCurrency(scheme.adminBalance)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Capital Works</p>
                    <p className="text-lg font-semibold">{formatCurrency(scheme.cwBalance)}</p>
                  </div>
                </div>
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/schemes/${scheme.id}/trust`}>
                    View Ledger
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Landmark className="size-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No transactions yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Record transactions within a scheme to see trust accounting data here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
