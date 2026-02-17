import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ReconciliationWorkspace } from '@/components/trust/reconciliation-workspace'

const FUND_LABELS: Record<string, string> = {
  admin: 'Admin Fund',
  capital_works: 'Capital Works Fund',
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

export default async function ReconciliationWorkspacePage({
  params,
}: {
  params: Promise<{ id: string; statementId: string }>
}) {
  const { id, statementId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: scheme } = await supabase
    .from('schemes')
    .select('id, scheme_name, scheme_number')
    .eq('id', id)
    .single()

  if (!scheme) notFound()

  // Fetch bank statement with lines and reconciliation status
  const { data: statement } = await supabase
    .from('bank_statements')
    .select(`
      *,
      bank_statement_lines(
        *,
        transactions:matched_transaction_id(id, transaction_date, description, amount, reference, transaction_type)
      ),
      reconciliations(id, status, reconciled_at)
    `)
    .eq('id', statementId)
    .single()

  if (!statement || statement.scheme_id !== id) notFound()

  const bankLines = (statement.bank_statement_lines ?? []) as Array<{
    id: string
    line_date: string
    description: string | null
    debit_amount: number
    credit_amount: number
    running_balance: number | null
    matched: boolean
    matched_transaction_id: string | null
    transactions: {
      id: string
      transaction_date: string
      description: string | null
      amount: number
      reference: string | null
      transaction_type: string
    } | null
  }>

  const reconciliation = (statement.reconciliations as Array<{ id: string; status: string; reconciled_at: string }> | null)?.[0]
  const isFinalized = reconciliation?.status === 'reconciled'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reconciliation Workspace</h2>
          <p className="text-muted-foreground">
            <Link href={`/schemes/${id}`} className="hover:underline">{scheme.scheme_name}</Link>
            {' '}&mdash;{' '}
            <Link href={`/schemes/${id}/trust/reconciliation`} className="hover:underline">Reconciliation</Link>
            {' '}&mdash; {formatDate(statement.statement_date)} ({FUND_LABELS[statement.fund_type] ?? statement.fund_type})
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/schemes/${id}/trust/reconciliation`}>
            <ArrowLeft className="mr-2 size-4" />
            Back
          </Link>
        </Button>
      </div>

      <ReconciliationWorkspace
        bankStatementId={statementId}
        schemeId={id}
        bankLines={bankLines}
        closingBalance={statement.closing_balance}
        isFinalized={isFinalized}
      />
    </div>
  )
}
