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
 * Add a quote to a maintenance request.
 */
export async function addQuote(
  requestId: string,
  data: {
    quote_amount: number
    quote_date: string
    tradesperson_id?: string | null
    description?: string | null
    quote_reference?: string | null
  },
) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase, user } = result as Exclude<typeof result, { error: string }>

  if (data.quote_amount <= 0) {
    return { error: 'Quote amount must be greater than zero' }
  }

  if (!data.quote_date || !/^\d{4}-\d{2}-\d{2}$/.test(data.quote_date)) {
    return { error: 'Quote date is required (YYYY-MM-DD)' }
  }

  const { data: quote, error } = await supabase
    .from('quotes')
    .insert({
      maintenance_request_id: requestId,
      quote_amount: data.quote_amount,
      quote_date: data.quote_date,
      tradesperson_id: data.tradesperson_id || null,
      description: data.description?.trim() || null,
      quote_reference: data.quote_reference?.trim() || null,
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

  return { data: quote }
}

/**
 * Approve a quote. Sets approval_status='approved', records who approved and when.
 */
export async function approveQuote(quoteId: string) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase, user } = result as Exclude<typeof result, { error: string }>

  // Verify the quote is currently pending
  const { data: current, error: fetchError } = await supabase
    .from('quotes')
    .select('approval_status, maintenance_request_id')
    .eq('id', quoteId)
    .single()

  if (fetchError) return { error: fetchError.message }

  if (current.approval_status !== 'pending') {
    return { error: `Cannot approve a quote with status "${current.approval_status}". Must be "pending".` }
  }

  const { data: quote, error } = await supabase
    .from('quotes')
    .update({
      approval_status: 'approved',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq('id', quoteId)
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
    .eq('id', current.maintenance_request_id)
    .single()

  if (request) {
    revalidatePath(`/schemes/${request.scheme_id}/maintenance/${current.maintenance_request_id}`)
  }

  return { data: quote }
}

/**
 * Reject a quote with a reason. Sets approval_status='rejected'.
 */
export async function rejectQuote(quoteId: string, reason?: string) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  // Verify the quote is currently pending
  const { data: current, error: fetchError } = await supabase
    .from('quotes')
    .select('approval_status, maintenance_request_id')
    .eq('id', quoteId)
    .single()

  if (fetchError) return { error: fetchError.message }

  if (current.approval_status !== 'pending') {
    return { error: `Cannot reject a quote with status "${current.approval_status}". Must be "pending".` }
  }

  const { data: quote, error } = await supabase
    .from('quotes')
    .update({
      approval_status: 'rejected',
      rejection_reason: reason?.trim() || null,
    })
    .eq('id', quoteId)
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
    .eq('id', current.maintenance_request_id)
    .single()

  if (request) {
    revalidatePath(`/schemes/${request.scheme_id}/maintenance/${current.maintenance_request_id}`)
  }

  return { data: quote }
}

/**
 * List quotes for a maintenance request, including tradesperson name.
 */
export async function listQuotes(requestId: string) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  const { data: quotes, error } = await supabase
    .from('quotes')
    .select(`
      *,
      tradespeople:tradesperson_id(id, business_name, contact_name)
    `)
    .eq('maintenance_request_id', requestId)
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }
  return { data: quotes }
}
