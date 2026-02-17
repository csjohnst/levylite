import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, Upload, CheckCircle2, Clock } from 'lucide-react'
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
import { BankStatementUpload } from '@/components/trust/bank-statement-upload'

function formatCurrency(amount: number): string {
  return '$' + amount.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

const FUND_LABELS: Record<string, string> = {
  admin: 'Admin Fund',
  capital_works: 'Capital Works',
}

export default async function ReconciliationListPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: scheme } = await supabase
    .from('schemes')
    .select('id, scheme_name, scheme_number')
    .eq('id', id)
    .single()

  if (!scheme) notFound()

  // Fetch bank statements with line counts and reconciliation status
  const { data: statements } = await supabase
    .from('bank_statements')
    .select(`
      *,
      bank_statement_lines(count),
      reconciliations(id, status, reconciled_at)
    `)
    .eq('scheme_id', id)
    .order('statement_date', { ascending: false })

  const statementList = (statements ?? []) as Array<{
    id: string
    fund_type: string
    statement_date: string
    opening_balance: number
    closing_balance: number
    uploaded_at: string
    bank_statement_lines: { count: number }[]
    reconciliations: { id: string; status: string; reconciled_at: string }[]
  }>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Bank Reconciliation</h2>
          <p className="text-muted-foreground">
            <Link href={`/schemes/${id}`} className="hover:underline">{scheme.scheme_name}</Link>
            {' '}&mdash;{' '}
            <Link href={`/schemes/${id}/trust`} className="hover:underline">Trust Accounting</Link>
            {' '}&mdash; Reconciliation
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/schemes/${id}/trust`}>
            <ArrowLeft className="mr-2 size-4" />
            Back to Ledger
          </Link>
        </Button>
      </div>

      {/* Upload section */}
      <BankStatementUpload schemeId={id} />

      {/* Statement history */}
      {statementList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Bank Statements</CardTitle>
            <CardDescription>
              {statementList.length} statement{statementList.length !== 1 ? 's' : ''} uploaded
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Fund</TableHead>
                  <TableHead className="text-right">Opening</TableHead>
                  <TableHead className="text-right">Closing</TableHead>
                  <TableHead>Lines</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {statementList.map(stmt => {
                  const lineCount = stmt.bank_statement_lines?.[0]?.count ?? 0
                  const reconciliation = stmt.reconciliations?.[0]
                  const isReconciled = reconciliation?.status === 'reconciled'

                  return (
                    <TableRow key={stmt.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {formatDate(stmt.statement_date)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {FUND_LABELS[stmt.fund_type] ?? stmt.fund_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(stmt.opening_balance)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(stmt.closing_balance)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{lineCount} line{lineCount !== 1 ? 's' : ''}</Badge>
                      </TableCell>
                      <TableCell>
                        {isReconciled ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            <CheckCircle2 className="mr-1 size-3" />
                            Reconciled
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-300">
                            <Clock className="mr-1 size-3" />
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/schemes/${id}/trust/reconciliation/${stmt.id}`}>
                            <ArrowRight className="size-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
