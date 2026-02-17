'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' as const }
  return { user, supabase }
}

export interface MaintenanceRequestFilters {
  status?: string
  priority?: string
  category?: string
  assignedTo?: string
}

/**
 * List maintenance requests for a scheme with optional filters.
 * Includes assigned tradesperson name via join.
 */
export async function listMaintenanceRequests(
  schemeId: string,
  filters?: MaintenanceRequestFilters,
) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  let query = supabase
    .from('maintenance_requests')
    .select(`
      *,
      tradespeople:assigned_to(id, business_name, contact_name, phone, email),
      lots:lot_id(id, lot_number, unit_number)
    `)
    .eq('scheme_id', schemeId)
    .order('created_at', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.priority) {
    query = query.eq('priority', filters.priority)
  }
  if (filters?.category) {
    query = query.eq('category', filters.category)
  }
  if (filters?.assignedTo) {
    query = query.eq('assigned_to', filters.assignedTo)
  }

  const { data: requests, error } = await query

  if (error) return { error: error.message }
  return { data: requests }
}

/**
 * Get a single maintenance request with all related data:
 * assigned tradesperson, comments (with user info), quotes (with tradesperson),
 * invoices, and attachments.
 */
export async function getMaintenanceRequest(id: string) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

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
      ),
      maintenance_attachments(
        id, file_path, file_name, file_type, file_size,
        attachment_type, caption, uploaded_by, created_at
      )
    `)
    .eq('id', id)
    .single()

  if (error) return { error: error.message }
  return { data: request }
}

/**
 * Create a new maintenance request for a scheme.
 */
export async function createMaintenanceRequest(
  schemeId: string,
  data: {
    title: string
    description: string
    location?: string | null
    priority?: string
    category?: string | null
    lot_id?: string | null
    responsibility?: string | null
  },
) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase, user } = result as Exclude<typeof result, { error: string }>

  if (!data.title || data.title.trim().length === 0) {
    return { error: 'Title is required' }
  }
  if (!data.description || data.description.trim().length === 0) {
    return { error: 'Description is required' }
  }

  const validPriorities = ['emergency', 'urgent', 'routine', 'cosmetic']
  const priority = data.priority || 'routine'
  if (!validPriorities.includes(priority)) {
    return { error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}` }
  }

  const validCategories = [
    'plumbing', 'electrical', 'painting', 'landscaping',
    'pest_control', 'cleaning', 'security', 'general',
  ]
  if (data.category && !validCategories.includes(data.category)) {
    return { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` }
  }

  const validResponsibilities = ['common_property', 'lot_owner', 'disputed']
  if (data.responsibility && !validResponsibilities.includes(data.responsibility)) {
    return { error: `Invalid responsibility. Must be one of: ${validResponsibilities.join(', ')}` }
  }

  const { data: request, error } = await supabase
    .from('maintenance_requests')
    .insert({
      scheme_id: schemeId,
      title: data.title.trim(),
      description: data.description.trim(),
      location: data.location?.trim() || null,
      priority,
      category: data.category || null,
      lot_id: data.lot_id || null,
      responsibility: data.responsibility || null,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/schemes/${schemeId}/maintenance`)
  return { data: request }
}

/**
 * Update a maintenance request. Handles status transitions and field updates.
 */
export async function updateMaintenanceRequest(
  id: string,
  data: {
    title?: string
    description?: string
    location?: string | null
    priority?: string
    category?: string | null
    status?: string
    responsibility?: string | null
    assigned_to?: string | null
    estimated_cost?: number | null
    actual_cost?: number | null
    scheduled_date?: string | null
  },
) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  if (data.title !== undefined && data.title.trim().length === 0) {
    return { error: 'Title cannot be empty' }
  }

  const validStatuses = [
    'new', 'acknowledged', 'assigned', 'quoted',
    'approved', 'in_progress', 'completed', 'closed',
  ]
  if (data.status && !validStatuses.includes(data.status)) {
    return { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }
  }

  const updatePayload: Record<string, unknown> = {}
  if (data.title !== undefined) updatePayload.title = data.title.trim()
  if (data.description !== undefined) updatePayload.description = data.description.trim()
  if (data.location !== undefined) updatePayload.location = data.location?.trim() || null
  if (data.priority !== undefined) updatePayload.priority = data.priority
  if (data.category !== undefined) updatePayload.category = data.category || null
  if (data.status !== undefined) updatePayload.status = data.status
  if (data.responsibility !== undefined) updatePayload.responsibility = data.responsibility || null
  if (data.assigned_to !== undefined) updatePayload.assigned_to = data.assigned_to || null
  if (data.estimated_cost !== undefined) updatePayload.estimated_cost = data.estimated_cost
  if (data.actual_cost !== undefined) updatePayload.actual_cost = data.actual_cost
  if (data.scheduled_date !== undefined) updatePayload.scheduled_date = data.scheduled_date || null

  // Set workflow timestamps based on status transitions
  if (data.status === 'acknowledged') {
    updatePayload.acknowledged_at = new Date().toISOString()
  }
  if (data.status === 'completed') {
    updatePayload.completed_at = new Date().toISOString()
  }
  if (data.status === 'closed') {
    updatePayload.closed_at = new Date().toISOString()
  }

  if (Object.keys(updatePayload).length === 0) {
    return { error: 'No fields to update' }
  }

  const { data: request, error } = await supabase
    .from('maintenance_requests')
    .update(updatePayload)
    .eq('id', id)
    .select('*, scheme_id')
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/schemes/${request.scheme_id}/maintenance`)
  revalidatePath(`/schemes/${request.scheme_id}/maintenance/${id}`)
  return { data: request }
}

/**
 * Add a comment to a maintenance request.
 */
export async function addComment(
  requestId: string,
  text: string,
  isInternal: boolean = false,
) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase, user } = result as Exclude<typeof result, { error: string }>

  if (!text || text.trim().length === 0) {
    return { error: 'Comment text is required' }
  }

  const { data: comment, error } = await supabase
    .from('maintenance_comments')
    .insert({
      maintenance_request_id: requestId,
      comment_text: text.trim(),
      is_internal: isInternal,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  // Get the scheme_id for revalidation
  const { data: request } = await supabase
    .from('maintenance_requests')
    .select('scheme_id')
    .eq('id', requestId)
    .single()

  if (request) {
    revalidatePath(`/schemes/${request.scheme_id}/maintenance/${requestId}`)
  }

  return { data: comment }
}

/**
 * List comments for a maintenance request, ordered by created_at ascending.
 */
export async function listComments(requestId: string) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  const { data: comments, error } = await supabase
    .from('maintenance_comments')
    .select('*')
    .eq('maintenance_request_id', requestId)
    .order('created_at', { ascending: true })

  if (error) return { error: error.message }
  return { data: comments }
}
