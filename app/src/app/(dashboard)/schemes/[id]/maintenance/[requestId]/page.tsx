import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RequestDetailClient } from '@/components/maintenance/request-detail-client'

export default async function MaintenanceRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string; requestId: string }>
}) {
  const { id, requestId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: scheme } = await supabase
    .from('schemes')
    .select('id, scheme_name, scheme_number')
    .eq('id', id)
    .single()

  if (!scheme) notFound()

  // Fetch the full maintenance request with related data
  const { data: request, error } = await supabase
    .from('maintenance_requests')
    .select(`
      *,
      tradespeople:assigned_to(id, business_name, contact_name, phone, email, trade_type),
      lots:lot_id(id, lot_number, unit_number),
      maintenance_comments(
        id, comment_text, is_internal, created_by, created_at
      ),
      quotes(
        id, quote_amount, quote_date, quote_reference, description,
        approval_status, approved_by, approved_at, rejection_reason,
        file_path, created_by, created_at,
        tradespeople:tradesperson_id(id, business_name, contact_name)
      ),
      invoices(
        id, invoice_number, invoice_date, invoice_amount, gst_amount,
        payment_reference, paid_at, file_path, created_by, created_at,
        tradespeople:tradesperson_id(id, business_name, contact_name)
      )
    `)
    .eq('id', requestId)
    .single()

  if (error || !request) notFound()

  // Sort comments ascending
  const comments = ((request.maintenance_comments ?? []) as Array<{
    id: string
    comment_text: string
    is_internal: boolean
    created_by: string
    created_at: string
  }>).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  const quotes = ((request.quotes ?? []) as Array<{
    id: string
    quote_amount: number
    quote_date: string
    quote_reference: string | null
    description: string | null
    approval_status: string
    approved_at: string | null
    rejection_reason: string | null
    created_at: string
    tradespeople: { id: string; business_name: string; contact_name: string | null } | null
  }>).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const invoices = ((request.invoices ?? []) as Array<{
    id: string
    invoice_number: string | null
    invoice_date: string
    invoice_amount: number
    gst_amount: number
    paid_at: string | null
    payment_reference: string | null
    created_at: string
    tradespeople: { id: string; business_name: string; contact_name: string | null } | null
  }>).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // Fetch all active tradespeople for the assign dialog and quote/invoice forms
  const { data: tradespeople } = await supabase
    .from('tradespeople')
    .select('id, business_name, contact_name, trade_type, phone, email, is_preferred')
    .eq('is_active', true)
    .order('business_name')

  // Fetch chart of accounts for the pay invoice dialog
  const { data: accounts } = await supabase
    .from('chart_of_accounts')
    .select('id, code, name, account_type, fund_type')
    .eq('scheme_id', id)
    .eq('is_active', true)
    .order('code')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{request.title}</h2>
          <p className="text-muted-foreground">
            <Link href={`/schemes/${id}`} className="hover:underline">{scheme.scheme_name}</Link>
            {' '}&mdash;{' '}
            <Link href={`/schemes/${id}/maintenance`} className="hover:underline">Maintenance</Link>
            {' '}&mdash; {request.title}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/schemes/${id}/maintenance`}>
            <ArrowLeft className="mr-2 size-4" />
            Back
          </Link>
        </Button>
      </div>

      <RequestDetailClient
        request={{
          id: request.id,
          scheme_id: request.scheme_id,
          title: request.title,
          description: request.description,
          location: request.location,
          priority: request.priority,
          category: request.category,
          status: request.status,
          responsibility: request.responsibility,
          estimated_cost: request.estimated_cost,
          actual_cost: request.actual_cost,
          scheduled_date: request.scheduled_date,
          acknowledged_at: request.acknowledged_at,
          completed_at: request.completed_at,
          closed_at: request.closed_at,
          created_at: request.created_at,
          tradespeople: request.tradespeople as {
            id: string
            business_name: string
            contact_name: string | null
            phone: string | null
            email: string | null
            trade_type: string | null
          } | null,
          lots: request.lots as {
            id: string
            lot_number: string
            unit_number: string | null
          } | null,
        }}
        comments={comments}
        quotes={quotes}
        invoices={invoices}
        allTradespeople={(tradespeople ?? []).map(tp => ({
          id: tp.id,
          business_name: tp.business_name,
          contact_name: tp.contact_name,
          trade_type: tp.trade_type,
          phone: tp.phone,
          email: tp.email,
          is_preferred: tp.is_preferred,
        }))}
        accounts={(accounts ?? []).map(a => ({
          id: a.id,
          code: a.code,
          name: a.name,
          account_type: a.account_type,
          fund_type: a.fund_type,
        }))}
      />
    </div>
  )
}
