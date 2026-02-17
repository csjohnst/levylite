'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { addInvoice } from '@/actions/maintenance-invoices'

interface Tradesperson {
  id: string
  business_name: string
  contact_name: string | null
}

interface AddInvoiceFormProps {
  requestId: string
  tradespeople: Tradesperson[]
}

export function AddInvoiceForm({ requestId, tradespeople }: AddInvoiceFormProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
  const [invoiceAmount, setInvoiceAmount] = useState('')
  const [gstAmount, setGstAmount] = useState('')
  const [tradespersonId, setTradespersonId] = useState('none')

  function resetForm() {
    setInvoiceNumber('')
    setInvoiceDate(new Date().toISOString().split('T')[0])
    setInvoiceAmount('')
    setGstAmount('')
    setTradespersonId('none')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const numAmount = parseFloat(invoiceAmount)
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid invoice amount')
      return
    }
    const numGst = gstAmount ? parseFloat(gstAmount) : 0
    if (isNaN(numGst) || numGst < 0) {
      toast.error('GST amount must be zero or positive')
      return
    }

    setLoading(true)
    const result = await addInvoice(requestId, {
      invoice_number: invoiceNumber.trim() || null,
      invoice_date: invoiceDate,
      invoice_amount: numAmount,
      gst_amount: numGst,
      tradesperson_id: tradespersonId === 'none' ? null : tradespersonId,
    })

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Invoice added')
      resetForm()
      setOpen(false)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-1 size-3" />
          Add Invoice
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Invoice</DialogTitle>
          <DialogDescription>
            Record an invoice received for this maintenance work.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="inv-number">Invoice Number</Label>
              <Input
                id="inv-number"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="e.g. INV-001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-date">Invoice Date *</Label>
              <Input
                id="inv-date"
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="inv-amount">Amount ($) *</Label>
              <Input
                id="inv-amount"
                type="number"
                step="0.01"
                min="0.01"
                value={invoiceAmount}
                onChange={(e) => setInvoiceAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-gst">GST ($)</Label>
              <Input
                id="inv-gst"
                type="number"
                step="0.01"
                min="0"
                value={gstAmount}
                onChange={(e) => setGstAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="inv-tradesperson">Tradesperson</Label>
            <Select value={tradespersonId} onValueChange={setTradespersonId}>
              <SelectTrigger id="inv-tradesperson">
                <SelectValue placeholder="Select tradesperson" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not specified</SelectItem>
                {tradespeople.map(tp => (
                  <SelectItem key={tp.id} value={tp.id}>
                    {tp.business_name}
                    {tp.contact_name && ` (${tp.contact_name})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Invoice'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
