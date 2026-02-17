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
 * List tradespeople for the current user's organisation.
 * Optional filtering by trade_type and text search on business_name/contact_name.
 */
export async function listTradespeople(filters?: {
  search?: string
  tradeType?: string
  activeOnly?: boolean
}) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  let query = supabase
    .from('tradespeople')
    .select('*')
    .order('business_name', { ascending: true })

  if (filters?.tradeType) {
    query = query.eq('trade_type', filters.tradeType)
  }

  if (filters?.activeOnly !== false) {
    query = query.eq('is_active', true)
  }

  if (filters?.search) {
    query = query.or(
      `business_name.ilike.%${filters.search}%,contact_name.ilike.%${filters.search}%`
    )
  }

  const { data: tradespeople, error } = await query

  if (error) return { error: error.message }
  return { data: tradespeople }
}

/**
 * Get a single tradesperson by ID.
 */
export async function getTradesperson(id: string) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  const { data: tradesperson, error } = await supabase
    .from('tradespeople')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return { error: error.message }
  return { data: tradesperson }
}

/**
 * Create a new tradesperson. ABN must be exactly 11 digits if provided.
 */
export async function createTradesperson(data: {
  business_name: string
  contact_name?: string | null
  email?: string | null
  phone?: string | null
  abn?: string | null
  trade_type?: string | null
  is_preferred?: boolean
  insurance_expiry?: string | null
  license_number?: string | null
  notes?: string | null
}) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase, user } = result as Exclude<typeof result, { error: string }>

  if (!data.business_name || data.business_name.trim().length === 0) {
    return { error: 'Business name is required' }
  }

  // Validate ABN: must be exactly 11 digits if provided
  if (data.abn) {
    const abnDigits = data.abn.replace(/\s/g, '')
    if (!/^\d{11}$/.test(abnDigits)) {
      return { error: 'ABN must be exactly 11 digits' }
    }
    data.abn = abnDigits
  }

  // Get the user's organisation_id
  const { data: membership, error: membershipError } = await supabase
    .from('organisation_members')
    .select('organisation_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (membershipError || !membership) {
    return { error: 'Could not determine your organisation' }
  }

  const { data: tradesperson, error } = await supabase
    .from('tradespeople')
    .insert({
      organisation_id: membership.organisation_id,
      business_name: data.business_name.trim(),
      contact_name: data.contact_name?.trim() || null,
      email: data.email?.trim() || null,
      phone: data.phone?.trim() || null,
      abn: data.abn || null,
      trade_type: data.trade_type || null,
      is_preferred: data.is_preferred ?? false,
      insurance_expiry: data.insurance_expiry || null,
      license_number: data.license_number?.trim() || null,
      notes: data.notes?.trim() || null,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/maintenance/tradespeople')
  return { data: tradesperson }
}

/**
 * Update a tradesperson's details.
 */
export async function updateTradesperson(id: string, data: {
  business_name?: string
  contact_name?: string | null
  email?: string | null
  phone?: string | null
  abn?: string | null
  trade_type?: string | null
  is_preferred?: boolean
  insurance_expiry?: string | null
  license_number?: string | null
  notes?: string | null
}) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  if (data.business_name !== undefined && data.business_name.trim().length === 0) {
    return { error: 'Business name cannot be empty' }
  }

  // Validate ABN if provided
  if (data.abn) {
    const abnDigits = data.abn.replace(/\s/g, '')
    if (!/^\d{11}$/.test(abnDigits)) {
      return { error: 'ABN must be exactly 11 digits' }
    }
    data.abn = abnDigits
  }

  const updatePayload: Record<string, unknown> = {}
  if (data.business_name !== undefined) updatePayload.business_name = data.business_name.trim()
  if (data.contact_name !== undefined) updatePayload.contact_name = data.contact_name?.trim() || null
  if (data.email !== undefined) updatePayload.email = data.email?.trim() || null
  if (data.phone !== undefined) updatePayload.phone = data.phone?.trim() || null
  if (data.abn !== undefined) updatePayload.abn = data.abn || null
  if (data.trade_type !== undefined) updatePayload.trade_type = data.trade_type || null
  if (data.is_preferred !== undefined) updatePayload.is_preferred = data.is_preferred
  if (data.insurance_expiry !== undefined) updatePayload.insurance_expiry = data.insurance_expiry || null
  if (data.license_number !== undefined) updatePayload.license_number = data.license_number?.trim() || null
  if (data.notes !== undefined) updatePayload.notes = data.notes?.trim() || null

  if (Object.keys(updatePayload).length === 0) {
    return { error: 'No fields to update' }
  }

  const { data: tradesperson, error } = await supabase
    .from('tradespeople')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/maintenance/tradespeople')
  return { data: tradesperson }
}

/**
 * Soft delete a tradesperson by setting is_active = false.
 */
export async function deleteTradesperson(id: string) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  const { data: tradesperson, error } = await supabase
    .from('tradespeople')
    .update({ is_active: false })
    .eq('id', id)
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/maintenance/tradespeople')
  return { data: tradesperson }
}
