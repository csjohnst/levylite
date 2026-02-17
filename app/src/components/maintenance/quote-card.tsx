'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { toast } from 'sonner'
import { approveQuote, rejectQuote } from '@/actions/maintenance-quotes'

interface Quote {
  id: string
  quote_amount: number
  quote_date: string
  quote_reference: string | null
  description: string | null
  approval_status: string
  approved_at: string | null
  rejection_reason: string | null
  created_at: string
  tradespeople: {
    id: string
    business_name: string
    contact_name: string | null
  } | null
}

interface QuoteCardProps {
  quote: Quote
}

function formatCurrency(amount: number): string {
  return '$' + Number(amount).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
}

export function QuoteCard({ quote }: QuoteCardProps) {
  const router = useRouter()
  const [approving, setApproving] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejecting, setRejecting] = useState(false)

  async function handleApprove() {
    setApproving(true)
    const result = await approveQuote(quote.id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Quote approved')
      router.refresh()
    }
    setApproving(false)
  }

  async function handleReject() {
    setRejecting(true)
    const result = await rejectQuote(quote.id, rejectReason)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Quote rejected')
      setShowRejectDialog(false)
      setRejectReason('')
      router.refresh()
    }
    setRejecting(false)
  }

  return (
    <>
      <div className="rounded-lg border p-4 space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-lg">{formatCurrency(quote.quote_amount)}</span>
              <Badge variant="secondary" className={STATUS_COLORS[quote.approval_status] ?? ''}>
                {quote.approval_status}
              </Badge>
            </div>
            {quote.tradespeople && (
              <p className="text-sm text-muted-foreground">
                {quote.tradespeople.business_name}
                {quote.tradespeople.contact_name && ` (${quote.tradespeople.contact_name})`}
              </p>
            )}
          </div>
          <span className="text-sm text-muted-foreground">{formatDate(quote.quote_date)}</span>
        </div>

        {quote.description && (
          <p className="text-sm">{quote.description}</p>
        )}

        {quote.quote_reference && (
          <p className="text-xs text-muted-foreground">Ref: {quote.quote_reference}</p>
        )}

        {quote.rejection_reason && (
          <p className="text-sm text-red-600">Reason: {quote.rejection_reason}</p>
        )}

        {quote.approval_status === 'pending' && (
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              variant="default"
              onClick={handleApprove}
              disabled={approving}
            >
              <Check className="mr-1 size-3" />
              {approving ? 'Approving...' : 'Approve'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowRejectDialog(true)}
            >
              <X className="mr-1 size-3" />
              Reject
            </Button>
          </div>
        )}
      </div>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Quote</DialogTitle>
            <DialogDescription>
              Optionally provide a reason for rejecting this quote of {formatCurrency(quote.quote_amount)}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Reason (optional)</Label>
            <Input
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Too expensive, found a better option"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={rejecting}>
              {rejecting ? 'Rejecting...' : 'Reject Quote'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
