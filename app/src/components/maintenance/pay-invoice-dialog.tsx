'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { payInvoice } from '@/actions/maintenance-invoices'

interface Account {
  id: string
  code: string
  name: string
  account_type: string
  fund_type: string | null
}

interface PayInvoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoiceId: string
  invoiceAmount: number
  invoiceNumber: string | null
  accounts: Account[]
}

function formatCurrency(amount: number): string {
  return '$' + Number(amount).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function PayInvoiceDialog({
  open,
  onOpenChange,
  invoiceId,
  invoiceAmount,
  invoiceNumber,
  accounts,
}: PayInvoiceDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [fundType, setFundType] = useState<'admin' | 'capital_works'>('admin')
  const [categoryId, setCategoryId] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [reference, setReference] = useState('')

  const expenseAccounts = accounts.filter(a => a.account_type === 'expense')

  async function handlePay() {
    if (!categoryId) {
      toast.error('Please select an expense category')
      return
    }
    if (!paymentDate) {
      toast.error('Please enter a payment date')
      return
    }

    setLoading(true)
    const result = await payInvoice(invoiceId, {
      fund_type: fundType,
      category_id: categoryId,
      payment_date: paymentDate,
      reference: reference || null,
    })

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Invoice paid and transaction recorded')
      onOpenChange(false)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pay Invoice</DialogTitle>
          <DialogDescription>
            Record payment of {formatCurrency(invoiceAmount)}
            {invoiceNumber && ` (Invoice #${invoiceNumber})`}.
            This will create a transaction in the trust accounting ledger.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Fund</Label>
              <Select value={fundType} onValueChange={(v) => setFundType(v as 'admin' | 'capital_works')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin Fund</SelectItem>
                  <SelectItem value="capital_works">Capital Works Fund</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment Date</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Expense Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an expense account" />
              </SelectTrigger>
              <SelectContent>
                {expenseAccounts.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.code} - {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Reference (optional)</Label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. EFT reference number"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handlePay} disabled={loading || !categoryId}>
            {loading ? 'Processing...' : 'Record Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
