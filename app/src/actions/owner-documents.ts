'use server'

import { createClient } from '@/lib/supabase/server'

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

/**
 * List documents visible to the owner.
 * Filters by visibility: 'owners' for all owners, 'committee' only if the owner is a committee member.
 * Supports filtering by schemeId, category, and text search.
 */
export async function getOwnerDocuments(filters?: {
  schemeId?: string
  category?: string
  search?: string
}) {
  const result = await getOwnerAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { owner, supabase } = result as Exclude<typeof result, { error: string }>

  // Get owner's scheme IDs
  const { data: ownerships } = await supabase
    .from('lot_ownerships')
    .select('lots(scheme_id)')
    .eq('owner_id', owner.id)
    .is('ownership_end_date', null)

  const schemeIds = [
    ...new Set(
      ownerships
        ?.map(o => {
          const lot = o.lots as unknown as { scheme_id: string }
          return lot?.scheme_id
        })
        .filter(Boolean) ?? []
    ),
  ]

  if (schemeIds.length === 0) return { data: [] }

  // Check which schemes the owner is a committee member of
  const { data: committeeMemberships } = await supabase
    .from('committee_members')
    .select('scheme_id')
    .eq('owner_id', owner.id)
    .eq('is_active', true)

  const committeeSchemeIds = new Set(
    committeeMemberships?.map(cm => cm.scheme_id) ?? []
  )

  // Build query - RLS will enforce access via the owner_select policy on documents
  let query = supabase
    .from('documents')
    .select('id, document_name, description, category, document_date, file_size, mime_type, tags, visibility, created_at, scheme_id')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  // Filter to owner's schemes (or a specific one)
  if (filters?.schemeId && schemeIds.includes(filters.schemeId)) {
    query = query.eq('scheme_id', filters.schemeId)
  } else {
    query = query.in('scheme_id', schemeIds)
  }

  if (filters?.category) {
    query = query.eq('category', filters.category)
  }

  if (filters?.search) {
    query = query.textSearch('search_vector', filters.search, { type: 'websearch' })
  }

  const { data: documents, error } = await query

  if (error) return { error: error.message }

  // Post-filter by visibility: owners can see 'owners' docs, committee members also see 'committee' docs
  const filtered = (documents ?? []).filter(doc => {
    if (doc.visibility === 'owners') return true
    if (doc.visibility === 'committee' && committeeSchemeIds.has(doc.scheme_id)) return true
    return false
  })

  return { data: filtered }
}

/**
 * Download a document accessible to the owner.
 * Generates a signed URL and logs the access in the audit log.
 */
export async function downloadOwnerDocument(documentId: string) {
  const result = await getOwnerAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { user, owner, supabase } = result as Exclude<typeof result, { error: string }>

  // Get the document - RLS owner_select policy will enforce scheme + visibility access
  const { data: document, error: fetchError } = await supabase
    .from('documents')
    .select('id, file_path, document_name, mime_type, scheme_id, visibility')
    .eq('id', documentId)
    .is('deleted_at', null)
    .single()

  if (fetchError) return { error: 'Document not found or access denied' }

  // Double-check: verify owner has access to this scheme
  const { data: ownership } = await supabase
    .from('lot_ownerships')
    .select('lots(scheme_id)')
    .eq('owner_id', owner.id)
    .is('ownership_end_date', null)

  const ownerSchemeIds = new Set(
    ownership?.map(o => {
      const lot = o.lots as unknown as { scheme_id: string }
      return lot?.scheme_id
    }).filter(Boolean) ?? []
  )

  if (!ownerSchemeIds.has(document.scheme_id)) {
    return { error: 'Access denied' }
  }

  // For 'committee' visibility, verify committee membership
  if (document.visibility === 'committee') {
    const { data: membership } = await supabase
      .from('committee_members')
      .select('id')
      .eq('owner_id', owner.id)
      .eq('scheme_id', document.scheme_id)
      .eq('is_active', true)
      .maybeSingle()

    if (!membership) return { error: 'Access denied: committee documents require committee membership' }
  }

  // Generate signed URL
  const { data: signedUrl, error: urlError } = await supabase.storage
    .from('scheme-documents')
    .createSignedUrl(document.file_path, 60 * 60) // 1 hour expiry

  if (urlError) return { error: `Failed to generate download URL: ${urlError.message}` }

  // Log the download in audit log
  await supabase.rpc('log_document_audit', {
    p_document_id: documentId,
    p_user_id: user.id,
    p_action: 'download',
    p_event_details: { accessed_via: 'owner_portal' },
  })

  return {
    data: {
      url: signedUrl.signedUrl,
      document_name: document.document_name,
      mime_type: document.mime_type,
    },
  }
}
