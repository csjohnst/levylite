'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { toast } from 'sonner'
import { createTransaction } from '@/actions/transactions'

interface Account {
  id: string
  code: string
  name: string
  account_type: string
  fund_type: string | null
  is_system: boolean
}

interface Lot {
  id: string
  lot_number: string
  unit_number: string | null
}

interface JournalLine {
  key: string
  account_id: string
  line_type: 'debit' | 'credit'
  amount: string
  description: string
}

interface TransactionFormProps {
  schemeId: string
  accounts: Account[]
  lots: Lot[]
}

function formatCurrency(amount: number): string {
  return '$' + amount.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function TransactionForm({ schemeId, accounts, lots }: TransactionFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [transactionType, setTransactionType] = useState<'receipt' | 'payment' | 'journal'>('receipt')
  const [fundType, setFundType] = useState<'admin' | 'capital_works'>('admin')
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [gstAmount, setGstAmount] = useState('0')
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('')
  const [reference, setReference] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('eft')
  const [lotId, setLotId] = useState('none')
  const [journalLines, setJournalLines] = useState<JournalLine[]>([
    { key: crypto.randomUUID(), account_id: '', line_type: 'debit', amount: '', description: '' },
    { key: crypto.randomUUID(), account_id: '', line_type: 'credit', amount: '', description: '' },
  ])

  // Filter accounts by type based on transaction type
  const categoryAccounts = accounts.filter(a => {
    if (transactionType === 'receipt') return a.account_type === 'income'
    if (transactionType === 'payment') return a.account_type === 'expense'
    return false
  })

  // Trust account for preview
  const trustAccountCode = fundType === 'admin' ? '1100' : '1200'
  const trustAccount = accounts.find(a => a.code === trustAccountCode)
  const selectedCategory = accounts.find(a => a.id === categoryId)

  // Journal line totals
  const totalDebits = journalLines
    .filter(l => l.line_type === 'debit')
    .reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0)
  const totalCredits = journalLines
    .filter(l => l.line_type === 'credit')
    .reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0)
  const isJournalBalanced = Math.abs(totalDebits - totalCredits) < 0.01

  function addJournalLine() {
    setJournalLines(prev => [
      ...prev,
      { key: crypto.randomUUID(), account_id: '', line_type: 'debit', amount: '', description: '' },
    ])
  }

  function removeJournalLine(key: string) {
    if (journalLines.length <= 2) return
    setJournalLines(prev => prev.filter(l => l.key !== key))
  }

  function updateJournalLine(key: string, field: keyof JournalLine, value: string) {
    setJournalLines(prev =>
      prev.map(l => l.key === key ? { ...l, [field]: value } : l)
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid amount')
      setLoading(false)
      return
    }

    const data: Parameters<typeof createTransaction>[1] = {
      transaction_date: transactionDate,
      transaction_type: transactionType,
      fund_type: fundType,
      category_id: transactionType !== 'journal' ? categoryId || null : null,
      amount: parsedAmount,
      gst_amount: parseFloat(gstAmount) || 0,
      description,
      reference: reference || null,
      payment_method: transactionType !== 'journal' ? paymentMethod as 'eft' | 'credit_card' | 'cheque' | 'cash' | 'bpay' : null,
      lot_id: lotId !== 'none' ? lotId : null,
    }

    if (transactionType === 'journal') {
      data.lines = journalLines
        .filter(l => l.account_id && l.amount)
        .map(l => ({
          account_id: l.account_id,
          line_type: l.line_type,
          amount: parseFloat(l.amount) || 0,
          description: l.description || null,
        }))
    }

    const result = await createTransaction(schemeId, data)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Transaction recorded')
      router.push(`/schemes/${schemeId}/trust`)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Transaction Type */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction Type</CardTitle>
          <CardDescription>Select the type of financial transaction</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {(['receipt', 'payment', 'journal'] as const).map(type => (
              <Button
                key={type}
                type="button"
                variant={transactionType === type ? 'default' : 'outline'}
                onClick={() => setTransactionType(type)}
                className="flex-1"
              >
                {type === 'receipt' ? 'Receipt (Money In)' : type === 'payment' ? 'Payment (Money Out)' : 'Journal Entry'}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left column: main fields */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="date">Transaction Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fund_type">Fund</Label>
                <Select value={fundType} onValueChange={(v) => setFundType(v as 'admin' | 'capital_works')}>
                  <SelectTrigger id="fund_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin Fund</SelectItem>
                    <SelectItem value="capital_works">Capital Works Fund</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {transactionType !== 'journal' && (
                <div className="space-y-2">
                  <Label htmlFor="category">
                    {transactionType === 'receipt' ? 'Income Category' : 'Expense Category'}
                  </Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryAccounts.map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.code} - {acc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {transactionType !== 'journal' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount ($)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gst">GST Amount ($)</Label>
                    <Input
                      id="gst"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={gstAmount}
                      onChange={(e) => setGstAmount(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="e.g. Quarterly levy payment - Lot 5"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference">Reference</Label>
                <Input
                  id="reference"
                  placeholder="e.g. INV-2026-001"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </div>

              {transactionType !== 'journal' && (
                <div className="space-y-2">
                  <Label htmlFor="method">Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger id="method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="eft">EFT</SelectItem>
                      <SelectItem value="bpay">BPAY</SelectItem>
                      <SelectItem value="credit_card">Credit Card</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {lots.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="lot">Lot (optional)</Label>
                  <Select value={lotId} onValueChange={setLotId}>
                    <SelectTrigger id="lot">
                      <SelectValue placeholder="No specific lot" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No specific lot</SelectItem>
                      {lots.map(lot => (
                        <SelectItem key={lot.id} value={lot.id}>
                          {lot.unit_number ? `Unit ${lot.unit_number}` : `Lot ${lot.lot_number}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: preview */}
        <div>
          {transactionType !== 'journal' && (parseFloat(amount) || 0) > 0 && selectedCategory && trustAccount && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Double-Entry Preview</CardTitle>
                <CardDescription>
                  The following ledger entries will be created automatically
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account</TableHead>
                        <TableHead className="text-right">Debit</TableHead>
                        <TableHead className="text-right">Credit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactionType === 'receipt' ? (
                        <>
                          <TableRow>
                            <TableCell className="font-medium">
                              <span className="font-mono text-xs text-muted-foreground mr-1">{trustAccount.code}</span>
                              {trustAccount.name}
                            </TableCell>
                            <TableCell className="text-right text-green-700 font-medium">
                              {formatCurrency(parseFloat(amount) || 0)}
                            </TableCell>
                            <TableCell />
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">
                              <span className="font-mono text-xs text-muted-foreground mr-1">{selectedCategory.code}</span>
                              {selectedCategory.name}
                            </TableCell>
                            <TableCell />
                            <TableCell className="text-right text-green-700 font-medium">
                              {formatCurrency(parseFloat(amount) || 0)}
                            </TableCell>
                          </TableRow>
                        </>
                      ) : (
                        <>
                          <TableRow>
                            <TableCell className="font-medium">
                              <span className="font-mono text-xs text-muted-foreground mr-1">{selectedCategory.code}</span>
                              {selectedCategory.name}
                            </TableCell>
                            <TableCell className="text-right text-red-700 font-medium">
                              {formatCurrency(parseFloat(amount) || 0)}
                            </TableCell>
                            <TableCell />
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">
                              <span className="font-mono text-xs text-muted-foreground mr-1">{trustAccount.code}</span>
                              {trustAccount.name}
                            </TableCell>
                            <TableCell />
                            <TableCell className="text-right text-red-700 font-medium">
                              {formatCurrency(parseFloat(amount) || 0)}
                            </TableCell>
                          </TableRow>
                        </>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Journal Lines section (only for journal type) */}
      {transactionType === 'journal' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Journal Lines</CardTitle>
                <CardDescription>
                  Enter debit and credit lines. Total debits must equal total credits.
                </CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addJournalLine}>
                <Plus className="mr-1 size-3" />
                Add Line
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead className="w-[120px]">Type</TableHead>
                    <TableHead className="w-[140px]">Amount</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {journalLines.map(line => (
                    <TableRow key={line.key}>
                      <TableCell>
                        <Select
                          value={line.account_id}
                          onValueChange={(v) => updateJournalLine(line.key, 'account_id', v)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts.map(acc => (
                              <SelectItem key={acc.id} value={acc.id}>
                                {acc.code} - {acc.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={line.line_type}
                          onValueChange={(v) => updateJournalLine(line.key, 'line_type', v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="debit">Debit</SelectItem>
                            <SelectItem value="credit">Credit</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="0.00"
                          value={line.amount}
                          onChange={(e) => updateJournalLine(line.key, 'amount', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="Line description"
                          value={line.description}
                          onChange={(e) => updateJournalLine(line.key, 'description', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => removeJournalLine(line.key)}
                          disabled={journalLines.length <= 2}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Journal balance summary */}
            <div className="mt-3 flex items-center justify-between rounded-md bg-muted p-3 text-sm">
              <div className="flex gap-6">
                <span>Debits: <strong>{formatCurrency(totalDebits)}</strong></span>
                <span>Credits: <strong>{formatCurrency(totalCredits)}</strong></span>
              </div>
              <Badge variant={isJournalBalanced && totalDebits > 0 ? 'secondary' : 'destructive'}>
                {isJournalBalanced && totalDebits > 0
                  ? 'Balanced'
                  : totalDebits === 0 && totalCredits === 0
                    ? 'Enter amounts'
                    : `Difference: ${formatCurrency(Math.abs(totalDebits - totalCredits))}`
                }
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={
            loading
            || !description
            || !transactionDate
            || (transactionType !== 'journal' && (!amount || !categoryId))
            || (transactionType === 'journal' && (!isJournalBalanced || totalDebits === 0))
          }
        >
          {loading ? 'Recording...' : 'Record Transaction'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
