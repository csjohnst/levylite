'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DollarSign } from 'lucide-react'

interface Invoice {
  id: string
  invoice_number: string | null
  invoice_date: string
  invoice_amount: number
  gst_amount: number
  paid_at: string | null
  payment_reference: string | null
  created_at: string
  tradespeople: {
    id: string
    business_name: string
    contact_name: string | null
  } | null
}

interface InvoiceCardProps {
  invoice: Invoice
  onPayClick: (invoice: Invoice) => void
}

function formatCurrency(amount: number): string {
  return '$' + Number(amount).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

export function InvoiceCard({ invoice, onPayClick }: InvoiceCardProps) {
  const isPaid = !!invoice.paid_at

  return (
    <div className="rounded-lg border p-4 space-y-2">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-lg">{formatCurrency(invoice.invoice_amount)}</span>
            {invoice.gst_amount > 0 && (
              <span className="text-xs text-muted-foreground">(incl. {formatCurrency(invoice.gst_amount)} GST)</span>
            )}
            <Badge
              variant="secondary"
              className={isPaid ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}
            >
              {isPaid ? 'Paid' : 'Unpaid'}
            </Badge>
          </div>
          {invoice.tradespeople && (
            <p className="text-sm text-muted-foreground">
              {invoice.tradespeople.business_name}
              {invoice.tradespeople.contact_name && ` (${invoice.tradespeople.contact_name})`}
            </p>
          )}
        </div>
        <span className="text-sm text-muted-foreground">{formatDate(invoice.invoice_date)}</span>
      </div>

      {invoice.invoice_number && (
        <p className="text-xs text-muted-foreground">Invoice #: {invoice.invoice_number}</p>
      )}

      {isPaid && invoice.paid_at && (
        <p className="text-xs text-green-700">
          Paid on {new Date(invoice.paid_at).toLocaleDateString('en-AU')}
        </p>
      )}

      {!isPaid && (
        <div className="pt-2">
          <Button
            size="sm"
            variant="default"
            onClick={() => onPayClick(invoice)}
          >
            <DollarSign className="mr-1 size-3" />
            Pay Invoice
          </Button>
        </div>
      )}
    </div>
  )
}
