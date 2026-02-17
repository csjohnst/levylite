'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

async function getOwnerAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' as const }

  const { data: owner, error } = await supabase
    .from('owners')
    .select('id, first_name, last_name, email, portal_user_id')
    .eq('portal_user_id', user.id)
    .single()

  if (error || !owner) return { error: 'Not an owner' as const }
  return { user, owner, supabase }
}

const maintenanceRequestSchema = z.object({
  lot_id: z.string().uuid('Invalid lot'),
  subject: z.string().min(1, 'Subject is required').max(500),
  description: z.string().min(1, 'Description is required').max(5000),
  location: z.string().max(500).optional().nullable(),
  priority: z.enum(['emergency', 'urgent', 'routine', 'cosmetic']).optional().default('routine'),
})

/**
 * List maintenance requests for the owner's lots.
 * Supports filtering by status and lot_id.
 */
export async function getOwnerMaintenanceRequests(filters?: {
  status?: string
  lotId?: string
}) {
  const result = await getOwnerAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { owner, supabase } = result as Exclude<typeof result, { error: string }>

  // Get owner's lot IDs
  const { data: ownerships } = await supabase
    .from('lot_ownerships')
    .select('lot_id')
    .eq('owner_id', owner.id)
    .is('ownership_end_date', null)

  const lotIds = ownerships?.map(o => o.lot_id) ?? []
  if (lotIds.length === 0) return { data: [] }

  // RLS owner_select policy will enforce access, but we also filter explicitly
  let query = supabase
    .from('maintenance_requests')
    .select(`
      id, title, description, location, status, priority, category,
      created_at, scheduled_date,
      lots:lot_id(id, lot_number, unit_number)
    `)
    .order('created_at', { ascending: false })

  // Filter by owner's lots or their submitted requests
  if (filters?.lotId && lotIds.includes(filters.lotId)) {
    query = query.eq('lot_id', filters.lotId)
  } else {
    query = query.in('lot_id', lotIds)
  }

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  const { data: requests, error } = await query

  if (error) return { error: error.message }
  return { data: requests ?? [] }
}

/**
 * Get full detail for a specific maintenance request accessible to the owner.
 * Includes non-internal comments.
 */
export async function getOwnerMaintenanceRequest(requestId: string) {
  const result = await getOwnerAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { owner, supabase } = result as Exclude<typeof result, { error: string }>

  // RLS owner_select policy enforces that only requests for owner's lots are returned
  const { data: request, error } = await supabase
    .from('maintenance_requests')
    .select(`
      id, title, description, location, status, priority, category,
      responsibility, estimated_cost, scheduled_date,
      acknowledged_at, completed_at, closed_at, created_at,
      lots:lot_id(id, lot_number, unit_number)
    `)
    .eq('id', requestId)
    .single()

  if (error) return { error: 'Maintenance request not found or access denied' }

  // Verify this request is for one of the owner's lots
  const { data: ownerships } = await supabase
    .from('lot_ownerships')
    .select('lot_id')
    .eq('owner_id', owner.id)
    .is('ownership_end_date', null)

  const lotIds = new Set(ownerships?.map(o => o.lot_id) ?? [])
  const requestLotId = (request.lots as unknown as { id: string })?.id
  if (requestLotId && !lotIds.has(requestLotId)) {
    return { error: 'Access denied' }
  }

  // Get non-internal comments (RLS owner_select policy also enforces is_internal = false)
  const { data: comments } = await supabase
    .from('maintenance_comments')
    .select('id, comment_text, is_internal, created_by, created_at')
    .eq('maintenance_request_id', requestId)
    .eq('is_internal', false)
    .order('created_at', { ascending: true })

  return {
    data: {
      ...request,
      comments: comments ?? [],
    },
  }
}

/**
 * Submit a new maintenance request from the owner portal.
 */
export async function submitMaintenanceRequest(data: {
  lot_id: string
  subject: string
  description: string
  location?: string
  priority?: string
}) {
  const parsed = maintenanceRequestSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const result = await getOwnerAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { user, owner, supabase } = result as Exclude<typeof result, { error: string }>

  // Verify the lot belongs to the owner
  const { data: ownership } = await supabase
    .from('lot_ownerships')
    .select('lot_id, lots(scheme_id)')
    .eq('owner_id', owner.id)
    .eq('lot_id', parsed.data.lot_id)
    .is('ownership_end_date', null)
    .maybeSingle()

  if (!ownership) return { error: 'You do not own this lot' }

  const schemeId = (ownership.lots as unknown as { scheme_id: string })?.scheme_id
  if (!schemeId) return { error: 'Could not determine scheme for this lot' }

  const { data: request, error } = await supabase
    .from('maintenance_requests')
    .insert({
      scheme_id: schemeId,
      lot_id: parsed.data.lot_id,
      title: parsed.data.subject.trim(),
      description: parsed.data.description.trim(),
      location: parsed.data.location?.trim() || null,
      priority: parsed.data.priority ?? 'routine',
      status: 'new',
      submitted_by_owner_id: owner.id,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/owner/maintenance')
  return { data: request }
}

/**
 * Add a comment to a maintenance request the owner has access to.
 * Owner comments are always non-internal (visible to everyone).
 */
export async function addMaintenanceComment(requestId: string, content: string) {
  if (!content || content.trim().length === 0) {
    return { error: 'Comment text is required' }
  }

  const result = await getOwnerAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { user, owner, supabase } = result as Exclude<typeof result, { error: string }>

  // Verify the owner has access to this maintenance request
  const { data: request } = await supabase
    .from('maintenance_requests')
    .select('id, lot_id, scheme_id')
    .eq('id', requestId)
    .single()

  if (!request) return { error: 'Maintenance request not found' }

  const { data: ownership } = await supabase
    .from('lot_ownerships')
    .select('lot_id')
    .eq('owner_id', owner.id)
    .eq('lot_id', request.lot_id)
    .is('ownership_end_date', null)
    .maybeSingle()

  if (!ownership) return { error: 'Access denied' }

  // Insert comment (always non-internal for owners)
  const { data: comment, error } = await supabase
    .from('maintenance_comments')
    .insert({
      maintenance_request_id: requestId,
      comment_text: content.trim(),
      is_internal: false,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/owner/maintenance')
  revalidatePath(`/owner/maintenance/${requestId}`)
  return { data: comment }
}
