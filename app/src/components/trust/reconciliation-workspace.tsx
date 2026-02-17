'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, Zap, Link2, Unlink, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  autoMatchBankLines,
  unmatchBankLine,
  finalizeReconciliation,
  createTransactionFromBankLine,
} from '@/actions/bank-reconciliation'

interface BankLine {
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
}

interface Account {
  id: string
  code: string
  name: string
  account_type: string
  fund_type: string | null
}

interface ReconciliationWorkspaceProps {
  bankStatementId: string
  schemeId: string
  bankLines: BankLine[]
  closingBalance: number
  isFinalized: boolean
  accounts: Account[]
}

function formatCurrency(amount: number): string {
  return '$' + amount.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

export function ReconciliationWorkspace({
  bankStatementId,
  schemeId,
  bankLines,
  closingBalance,
  isFinalized,
  accounts,
}: ReconciliationWorkspaceProps) {
  const router = useRouter()
  const [autoMatching, setAutoMatching] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [creatingForLine, setCreatingForLine] = useState<BankLine | null>(null)
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [createType, setCreateType] = useState<'receipt' | 'payment'>('receipt')
  const [createFund, setCreateFund] = useState<'admin' | 'capital_works'>('admin')
  const [createDescription, setCreateDescription] = useState('')
  const [createCategory, setCreateCategory] = useState('')

  const matchedLines = bankLines.filter(l => l.matched)
  const unmatchedLines = bankLines.filter(l => !l.matched)
  const allMatched = unmatchedLines.length === 0

  function openCreateDialog(line: BankLine) {
    setCreatingForLine(line)
    setCreateType(line.credit_amount > 0 ? 'receipt' : 'payment')
    setCreateFund('admin')
    setCreateDescription(line.description || '')
    setCreateCategory('')
  }

  // Filter accounts based on current transaction type
  const filteredAccounts = accounts.filter(a =>
    createType === 'receipt' ? a.account_type === 'income' : a.account_type === 'expense'
  )

  async function handleCreateTransaction() {
    if (!creatingForLine) return
    setCreateSubmitting(true)

    const line = creatingForLine
    const amount = line.credit_amount > 0 ? line.credit_amount : line.debit_amount

    const result = await createTransactionFromBankLine(line.id, {
      transaction_date: line.line_date,
      transaction_type: createType,
      fund_type: createFund,
      category_id: createCategory || undefined,
      amount,
      gst_amount: 0,
      description: createDescription || line.description || 'Bank transaction',
    })

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Transaction created and matched')
      setCreatingForLine(null)
      router.refresh()
    }
    setCreateSubmitting(false)
  }

  async function handleAutoMatch() {
    setAutoMatching(true)
    const result = await autoMatchBankLines(bankStatementId)
    if (result.error) {
      toast.error(result.error)
    } else if (result.data) {
      toast.success(`Auto-matched ${result.data.autoMatched} line(s). ${result.data.unmatched} remain unmatched.`)
      router.refresh()
    }
    setAutoMatching(false)
  }

  async function handleUnmatch(lineId: string) {
    const result = await unmatchBankLine(lineId)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Match removed')
      router.refresh()
    }
  }

  async function handleFinalize() {
    setFinalizing(true)
    const result = await finalizeReconciliation(bankStatementId)
    if (result.error) {
      toast.error(result.error)
    } else if (result.data) {
      toast.success(`Reconciliation complete. ${result.data.transactionsReconciled} transaction(s) marked as reconciled.`)
      router.refresh()
    }
    setFinalizing(false)
  }

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
        <div className="flex flex-wrap gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Total Lines: </span>
            <strong>{bankLines.length}</strong>
          </div>
          <div>
            <span className="text-muted-foreground">Matched: </span>
            <strong className="text-green-700">{matchedLines.length}</strong>
          </div>
          <div>
            <span className="text-muted-foreground">Unmatched: </span>
            <strong className={unmatchedLines.length > 0 ? 'text-red-700' : 'text-green-700'}>{unmatchedLines.length}</strong>
          </div>
          <div>
            <span className="text-muted-foreground">Bank Balance: </span>
            <strong>{formatCurrency(closingBalance)}</strong>
          </div>
        </div>
        <div className="flex gap-2">
          {!isFinalized && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoMatch}
                disabled={autoMatching || unmatchedLines.length === 0}
              >
                <Zap className="mr-1 size-3" />
                {autoMatching ? 'Matching...' : 'Auto-Match'}
              </Button>
              <Button
                size="sm"
                onClick={handleFinalize}
                disabled={finalizing || !allMatched}
              >
                <Check className="mr-1 size-3" />
                {finalizing ? 'Finalizing...' : 'Finalize'}
              </Button>
            </>
          )}
          {isFinalized && (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Reconciled
            </Badge>
          )}
        </div>
      </div>

      {/* Unmatched lines */}
      {unmatchedLines.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-red-700">Unmatched Bank Lines ({unmatchedLines.length})</CardTitle>
            <CardDescription>
              These bank lines have not been matched to ledger transactions. Use Auto-Match or manually create transactions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unmatchedLines.map(line => (
                <div
                  key={line.id}
                  className="flex items-center justify-between rounded-md border border-red-200 bg-red-50 p-3 text-sm"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground whitespace-nowrap">{formatDate(line.line_date)}</span>
                      <span className="font-medium truncate">{line.description || 'No description'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    {line.credit_amount > 0 && (
                      <span className="text-green-700 font-medium whitespace-nowrap">
                        +{formatCurrency(line.credit_amount)}
                      </span>
                    )}
                    {line.debit_amount > 0 && (
                      <span className="text-red-700 font-medium whitespace-nowrap">
                        -{formatCurrency(line.debit_amount)}
                      </span>
                    )}
                    {!isFinalized && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-2 flex-shrink-0"
                        onClick={() => openCreateDialog(line)}
                      >
                        <Plus className="mr-1 size-3" />
                        Create
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Matched lines */}
      {matchedLines.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-green-700">Matched ({matchedLines.length})</CardTitle>
            <CardDescription>
              These bank lines have been matched to ledger transactions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {matchedLines.map(line => (
                <div
                  key={line.id}
                  className="flex items-center gap-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm"
                >
                  {/* Bank line */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground whitespace-nowrap">{formatDate(line.line_date)}</span>
                      <span className="truncate">{line.description || '-'}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {line.credit_amount > 0 ? `+${formatCurrency(line.credit_amount)}` : `-${formatCurrency(line.debit_amount)}`}
                    </div>
                  </div>

                  {/* Match indicator */}
                  <div className="flex-shrink-0">
                    <Link2 className="size-4 text-green-600" />
                  </div>

                  {/* Matched transaction */}
                  <div className="flex-1 min-w-0">
                    {line.transactions ? (
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {line.transactions.transaction_type}
                          </Badge>
                          <span className="truncate">{line.transactions.description || '-'}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(line.transactions.transaction_date)} | {formatCurrency(line.transactions.amount)}
                          {line.transactions.reference && ` | Ref: ${line.transactions.reference}`}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Transaction not found</span>
                    )}
                  </div>

                  {/* Unmatch button */}
                  {!isFinalized && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 flex-shrink-0"
                      onClick={() => handleUnmatch(line.id)}
                    >
                      <Unlink className="size-4 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {bankLines.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>No bank statement lines to display.</p>
          </CardContent>
        </Card>
      )}

      {/* Create Transaction Dialog */}
      <Dialog open={!!creatingForLine} onOpenChange={(open) => { if (!open) setCreatingForLine(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Transaction from Bank Line</DialogTitle>
            <DialogDescription>
              Create a ledger transaction and automatically match it to this bank line.
            </DialogDescription>
          </DialogHeader>
          {creatingForLine && (
            <div className="space-y-4">
              <div className="rounded-md bg-muted p-3 text-sm">
                <div className="flex justify-between">
                  <span>{formatDate(creatingForLine.line_date)}</span>
                  <span className="font-medium">
                    {creatingForLine.credit_amount > 0
                      ? `+${formatCurrency(creatingForLine.credit_amount)}`
                      : `-${formatCurrency(creatingForLine.debit_amount)}`}
                  </span>
                </div>
                <p className="text-muted-foreground mt-1">{creatingForLine.description || 'No description'}</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Transaction Type</Label>
                  <Select value={createType} onValueChange={(v) => setCreateType(v as 'receipt' | 'payment')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="receipt">Receipt</SelectItem>
                      <SelectItem value="payment">Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fund</Label>
                  <Select value={createFund} onValueChange={(v) => setCreateFund(v as 'admin' | 'capital_works')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin Fund</SelectItem>
                      <SelectItem value="capital_works">Capital Works Fund</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={createCategory} onValueChange={setCreateCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredAccounts.map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.code} - {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreatingForLine(null)}>Cancel</Button>
            <Button onClick={handleCreateTransaction} disabled={createSubmitting || !createCategory}>
              {createSubmitting ? 'Creating...' : 'Create & Match'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
