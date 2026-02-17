'use client'

import { useState } from 'react'
import { UserPlus, FileText, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { RequestStatusActions } from '@/components/maintenance/request-status-actions'
import { CommentThread } from '@/components/maintenance/comment-thread'
import { QuoteCard } from '@/components/maintenance/quote-card'
import { InvoiceCard } from '@/components/maintenance/invoice-card'
import { PayInvoiceDialog } from '@/components/maintenance/pay-invoice-dialog'
import { AssignTradespersonDialog } from '@/components/maintenance/assign-tradesperson-dialog'
import { AddQuoteForm } from '@/components/maintenance/add-quote-form'
import { AddInvoiceForm } from '@/components/maintenance/add-invoice-form'

interface Tradesperson {
  id: string
  business_name: string
  contact_name: string | null
  trade_type: string | null
  phone: string | null
  email: string | null
  is_preferred: boolean
}

interface Comment {
  id: string
  comment_text: string
  is_internal: boolean
  created_by: string
  created_at: string
}

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

interface Account {
  id: string
  code: string
  name: string
  account_type: string
  fund_type: string | null
}

interface MaintenanceRequest {
  id: string
  scheme_id: string
  title: string
  description: string
  location: string | null
  priority: string
  category: string | null
  status: string
  responsibility: string | null
  estimated_cost: number | null
  actual_cost: number | null
  scheduled_date: string | null
  acknowledged_at: string | null
  completed_at: string | null
  closed_at: string | null
  created_at: string
  tradespeople: {
    id: string
    business_name: string
    contact_name: string | null
    phone: string | null
    email: string | null
    trade_type: string | null
  } | null
  lots: {
    id: string
    lot_number: string
    unit_number: string | null
  } | null
}

interface RequestDetailClientProps {
  request: MaintenanceRequest
  comments: Comment[]
  quotes: Quote[]
  invoices: Invoice[]
  allTradespeople: Tradesperson[]
  accounts: Account[]
}

const PRIORITY_COLORS: Record<string, string> = {
  emergency: 'bg-red-100 text-red-800',
  urgent: 'bg-amber-100 text-amber-800',
  routine: 'bg-blue-100 text-blue-800',
  cosmetic: 'bg-gray-100 text-gray-800',
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-gray-100 text-gray-800',
  acknowledged: 'bg-blue-100 text-blue-800',
  assigned: 'bg-indigo-100 text-indigo-800',
  quoted: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  in_progress: 'bg-orange-100 text-orange-800',
  completed: 'bg-emerald-100 text-emerald-800',
  closed: 'bg-slate-100 text-slate-800',
}

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  acknowledged: 'Acknowledged',
  assigned: 'Assigned',
  quoted: 'Quoted',
  approved: 'Approved',
  in_progress: 'In Progress',
  completed: 'Completed',
  closed: 'Closed',
}

const CATEGORY_LABELS: Record<string, string> = {
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  painting: 'Painting',
  landscaping: 'Landscaping',
  pest_control: 'Pest Control',
  cleaning: 'Cleaning',
  security: 'Security',
  general: 'General',
}

const RESPONSIBILITY_LABELS: Record<string, string> = {
  common_property: 'Common Property',
  lot_owner: 'Lot Owner',
  disputed: 'Disputed',
}

function formatCurrency(amount: number): string {
  return '$' + Number(amount).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function RequestDetailClient({
  request,
  comments,
  quotes,
  invoices,
  allTradespeople,
  accounts,
}: RequestDetailClientProps) {
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null)

  const assignedTp = request.tradespeople
  const tradespeopleForForms = allTradespeople.map(tp => ({
    id: tp.id,
    business_name: tp.business_name,
    contact_name: tp.contact_name,
  }))

  return (
    <div className="space-y-6">
      {/* Header with status and priority */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className={PRIORITY_COLORS[request.priority] ?? ''}>
          {request.priority}
        </Badge>
        <Badge variant="secondary" className={STATUS_COLORS[request.status] ?? ''}>
          {STATUS_LABELS[request.status] ?? request.status}
        </Badge>
        {request.category && (
          <Badge variant="outline">
            {CATEGORY_LABELS[request.category] ?? request.category}
          </Badge>
        )}
      </div>

      {/* Status Actions */}
      <RequestStatusActions
        requestId={request.id}
        currentStatus={request.status}
        hasAssignedTradesperson={!!assignedTp}
      />

      {/* Info Section */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <span className="text-muted-foreground">Description</span>
              <p className="mt-1 whitespace-pre-wrap">{request.description}</p>
            </div>
            {request.location && (
              <div>
                <span className="text-muted-foreground">Location:</span>{' '}
                {request.location}
              </div>
            )}
            {request.responsibility && (
              <div>
                <span className="text-muted-foreground">Responsibility:</span>{' '}
                {RESPONSIBILITY_LABELS[request.responsibility] ?? request.responsibility}
              </div>
            )}
            {request.lots && (
              <div>
                <span className="text-muted-foreground">Related Lot:</span>{' '}
                Lot {request.lots.lot_number}
                {request.lots.unit_number && ` (Unit ${request.lots.unit_number})`}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assignment & Costs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-muted-foreground">Assigned To:</span>{' '}
                {assignedTp ? (
                  <span>
                    {assignedTp.business_name}
                    {assignedTp.contact_name && ` (${assignedTp.contact_name})`}
                    {assignedTp.phone && (
                      <span className="text-muted-foreground"> | {assignedTp.phone}</span>
                    )}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Unassigned</span>
                )}
              </div>
              {request.status !== 'completed' && request.status !== 'closed' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAssignDialog(true)}
                >
                  <UserPlus className="mr-1 size-3" />
                  {assignedTp ? 'Reassign' : 'Assign'}
                </Button>
              )}
            </div>
            {request.estimated_cost !== null && (
              <div>
                <span className="text-muted-foreground">Estimated Cost:</span>{' '}
                {formatCurrency(request.estimated_cost)}
              </div>
            )}
            {request.actual_cost !== null && (
              <div>
                <span className="text-muted-foreground">Actual Cost:</span>{' '}
                {formatCurrency(request.actual_cost)}
              </div>
            )}
            {request.scheduled_date && (
              <div>
                <span className="text-muted-foreground">Scheduled:</span>{' '}
                {formatDate(request.scheduled_date)}
              </div>
            )}
            <div className="pt-2 border-t space-y-1 text-xs text-muted-foreground">
              <p>Created: {formatDateTime(request.created_at)}</p>
              {request.acknowledged_at && <p>Acknowledged: {formatDateTime(request.acknowledged_at)}</p>}
              {request.completed_at && <p>Completed: {formatDateTime(request.completed_at)}</p>}
              {request.closed_at && <p>Closed: {formatDateTime(request.closed_at)}</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quotes Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="size-4" />
                Quotes ({quotes.length})
              </CardTitle>
              <CardDescription>Quotes received for this work</CardDescription>
            </div>
            {request.status !== 'completed' && request.status !== 'closed' && (
              <AddQuoteForm requestId={request.id} tradespeople={tradespeopleForForms} />
            )}
          </div>
        </CardHeader>
        {quotes.length > 0 && (
          <CardContent className="space-y-3">
            {quotes.map(quote => (
              <QuoteCard key={quote.id} quote={quote} />
            ))}
          </CardContent>
        )}
      </Card>

      {/* Invoices Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="size-4" />
                Invoices ({invoices.length})
              </CardTitle>
              <CardDescription>Invoices received for this work</CardDescription>
            </div>
            {request.status !== 'closed' && (
              <AddInvoiceForm requestId={request.id} tradespeople={tradespeopleForForms} />
            )}
          </div>
        </CardHeader>
        {invoices.length > 0 && (
          <CardContent className="space-y-3">
            {invoices.map(invoice => (
              <InvoiceCard
                key={invoice.id}
                invoice={invoice}
                onPayClick={(inv) => setPayingInvoice(inv)}
              />
            ))}
          </CardContent>
        )}
      </Card>

      {/* Comments Section */}
      <CommentThread requestId={request.id} comments={comments} />

      {/* Dialogs */}
      <AssignTradespersonDialog
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
        requestId={request.id}
        tradespeople={allTradespeople}
        currentAssignedId={assignedTp?.id ?? null}
      />

      {payingInvoice && (
        <PayInvoiceDialog
          open={!!payingInvoice}
          onOpenChange={(open) => { if (!open) setPayingInvoice(null) }}
          invoiceId={payingInvoice.id}
          invoiceAmount={payingInvoice.invoice_amount}
          invoiceNumber={payingInvoice.invoice_number}
          accounts={accounts}
        />
      )}
    </div>
  )
}
