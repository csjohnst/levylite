'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' as const }
  return { user, supabase }
}

/**
 * Add an invoice to a maintenance request.
 */
export async function addInvoice(
  requestId: string,
  data: {
    invoice_number?: string | null
    invoice_date: string
    invoice_amount: number
    gst_amount?: number
    tradesperson_id?: string | null
    quote_id?: string | null
  },
) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase, user } = result as Exclude<typeof result, { error: string }>

  if (data.invoice_amount <= 0) {
    return { error: 'Invoice amount must be greater than zero' }
  }

  if (!data.invoice_date || !/^\d{4}-\d{2}-\d{2}$/.test(data.invoice_date)) {
    return { error: 'Invoice date is required (YYYY-MM-DD)' }
  }

  if (data.gst_amount !== undefined && data.gst_amount < 0) {
    return { error: 'GST amount cannot be negative' }
  }

  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert({
      maintenance_request_id: requestId,
      invoice_number: data.invoice_number?.trim() || null,
      invoice_date: data.invoice_date,
      invoice_amount: data.invoice_amount,
      gst_amount: data.gst_amount ?? 0,
      tradesperson_id: data.tradesperson_id || null,
      quote_id: data.quote_id || null,
      created_by: user.id,
    })
    .select(`
      *,
      tradespeople:tradesperson_id(id, business_name, contact_name)
    `)
    .single()

  if (error) return { error: error.message }

  // Get scheme_id for revalidation
  const { data: request } = await supabase
    .from('maintenance_requests')
    .select('scheme_id')
    .eq('id', requestId)
    .single()

  if (request) {
    revalidatePath(`/schemes/${request.scheme_id}/maintenance/${requestId}`)
  }

  return { data: invoice }
}

/**
 * Pay an invoice by creating a trust accounting transaction.
 *
 * Steps:
 * 1. Get the invoice details and maintenance request (for scheme_id)
 * 2. Create a transaction in the `transactions` table (type='payment')
 * 3. The existing `auto_create_transaction_lines` trigger handles double-entry automatically
 * 4. Update the invoice: set payment_reference = transaction.id, paid_at = now()
 * 5. Optionally update maintenance_request actual_cost
 */
export async function payInvoice(
  invoiceId: string,
  paymentData: {
    fund_type: 'admin' | 'capital_works'
    category_id: string
    payment_date: string
    payment_method?: string | null
    reference?: string | null
  },
) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase, user } = result as Exclude<typeof result, { error: string }>

  if (!paymentData.payment_date || !/^\d{4}-\d{2}-\d{2}$/.test(paymentData.payment_date)) {
    return { error: 'Payment date is required (YYYY-MM-DD)' }
  }

  if (!paymentData.category_id) {
    return { error: 'Expense category is required' }
  }

  // 1. Get the invoice details
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select(`
      *,
      maintenance_requests:maintenance_request_id(id, scheme_id, title),
      tradespeople:tradesperson_id(id, business_name)
    `)
    .eq('id', invoiceId)
    .single()

  if (invoiceError) return { error: invoiceError.message }

  if (invoice.paid_at) {
    return { error: 'This invoice has already been paid' }
  }

  const schemeId = (invoice.maintenance_requests as { id: string; scheme_id: string; title: string }).scheme_id
  const requestTitle = (invoice.maintenance_requests as { id: string; scheme_id: string; title: string }).title
  const tradespersonName = (invoice.tradespeople as { id: string; business_name: string } | null)?.business_name ?? 'Unknown'

  // 2. Create a payment transaction in the trust accounting ledger
  const description = `Maintenance payment - ${requestTitle} - ${tradespersonName}`
  const refLabel = invoice.invoice_number ? ` (Inv: ${invoice.invoice_number})` : ''

  const validPaymentMethods = ['eft', 'credit_card', 'cheque', 'cash', 'bpay']
  const paymentMethod = paymentData.payment_method && validPaymentMethods.includes(paymentData.payment_method)
    ? paymentData.payment_method
    : 'eft'

  const { data: transaction, error: txnError } = await supabase
    .from('transactions')
    .insert({
      scheme_id: schemeId,
      transaction_date: paymentData.payment_date,
      transaction_type: 'payment',
      fund_type: paymentData.fund_type,
      category_id: paymentData.category_id,
      amount: invoice.invoice_amount,
      gst_amount: invoice.gst_amount ?? 0,
      description: `${description}${refLabel}`,
      reference: paymentData.reference?.trim() || invoice.invoice_number || null,
      payment_method: paymentMethod,
      created_by: user.id,
    })
    .select()
    .single()

  if (txnError) {
    return { error: `Failed to create payment transaction: ${txnError.message}` }
  }

  // 3. The auto_create_transaction_lines trigger handles double-entry automatically

  // 4. Update the invoice with payment reference
  const { error: updateError } = await supabase
    .from('invoices')
    .update({
      payment_reference: transaction.id,
      paid_at: new Date().toISOString(),
    })
    .eq('id', invoiceId)

  if (updateError) {
    return {
      error: `Transaction created but invoice update failed: ${updateError.message}`,
      data: { transaction },
    }
  }

  // 5. Update maintenance_request actual_cost (sum of all paid invoices)
  const requestId = (invoice.maintenance_requests as { id: string; scheme_id: string; title: string }).id
  const { data: paidInvoices } = await supabase
    .from('invoices')
    .select('invoice_amount')
    .eq('maintenance_request_id', requestId)
    .not('paid_at', 'is', null)

  if (paidInvoices) {
    const totalActualCost = Math.round(
      paidInvoices.reduce((sum, inv) => sum + Number(inv.invoice_amount), 0) * 100,
    ) / 100

    await supabase
      .from('maintenance_requests')
      .update({ actual_cost: totalActualCost })
      .eq('id', requestId)
  }

  revalidatePath(`/schemes/${schemeId}/maintenance/${requestId}`)
  revalidatePath(`/schemes/${schemeId}/maintenance`)
  revalidatePath(`/schemes/${schemeId}/trust-accounting`)
  revalidatePath(`/schemes/${schemeId}/trust-accounting/transactions`)

  return { data: { invoice: { ...invoice, payment_reference: transaction.id, paid_at: new Date().toISOString() }, transaction } }
}

/**
 * List invoices for a maintenance request, including tradesperson name and payment status.
 */
export async function listInvoices(requestId: string) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  const { data: invoices, error } = await supabase
    .from('invoices')
    .select(`
      *,
      tradespeople:tradesperson_id(id, business_name, contact_name),
      quotes:quote_id(id, quote_amount, quote_reference)
    `)
    .eq('maintenance_request_id', requestId)
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }
  return { data: invoices }
}
