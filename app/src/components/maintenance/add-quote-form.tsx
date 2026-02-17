'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { addQuote } from '@/actions/maintenance-quotes'

interface Tradesperson {
  id: string
  business_name: string
  contact_name: string | null
}

interface AddQuoteFormProps {
  requestId: string
  tradespeople: Tradesperson[]
}

export function AddQuoteForm({ requestId, tradespeople }: AddQuoteFormProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState('')
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().split('T')[0])
  const [tradespersonId, setTradespersonId] = useState('none')
  const [description, setDescription] = useState('')
  const [quoteReference, setQuoteReference] = useState('')

  function resetForm() {
    setAmount('')
    setQuoteDate(new Date().toISOString().split('T')[0])
    setTradespersonId('none')
    setDescription('')
    setQuoteReference('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid quote amount')
      return
    }

    setLoading(true)
    const result = await addQuote(requestId, {
      quote_amount: numAmount,
      quote_date: quoteDate,
      tradesperson_id: tradespersonId === 'none' ? null : tradespersonId,
      description: description.trim() || null,
      quote_reference: quoteReference.trim() || null,
    })

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Quote added')
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
          Add Quote
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Quote</DialogTitle>
          <DialogDescription>
            Record a quote from a tradesperson for this maintenance request.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="quote-amount">Amount ($) *</Label>
              <Input
                id="quote-amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quote-date">Quote Date *</Label>
              <Input
                id="quote-date"
                type="date"
                value={quoteDate}
                onChange={(e) => setQuoteDate(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quote-tradesperson">Tradesperson</Label>
            <Select value={tradespersonId} onValueChange={setTradespersonId}>
              <SelectTrigger id="quote-tradesperson">
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
          <div className="space-y-2">
            <Label htmlFor="quote-reference">Reference</Label>
            <Input
              id="quote-reference"
              value={quoteReference}
              onChange={(e) => setQuoteReference(e.target.value)}
              placeholder="e.g. Q-2026-001"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quote-description">Description</Label>
            <Textarea
              id="quote-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Scope of work included in this quote..."
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Quote'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
