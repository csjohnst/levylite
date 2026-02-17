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

/**
 * Get the full owner profile including lot information.
 */
export async function getOwnerProfile() {
  const result = await getOwnerAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { owner, supabase } = result as Exclude<typeof result, { error: string }>

  const { data: profile, error } = await supabase
    .from('owners')
    .select(`
      id, title, first_name, last_name, middle_name, preferred_name,
      email, email_secondary, phone_mobile, phone_home, phone_work,
      postal_address_line1, postal_address_line2, postal_suburb, postal_state, postal_postcode,
      abn, company_name, correspondence_method, notes, status,
      portal_activated_at, created_at,
      lot_ownerships(
        lot_id, ownership_type, ownership_percentage,
        lots(id, lot_number, unit_number, schemes(id, scheme_name))
      )
    `)
    .eq('id', owner.id)
    .single()

  if (error) return { error: error.message }
  return { data: profile }
}

const updateProfileSchema = z.object({
  phone_mobile: z.string().max(20).optional().nullable(),
  phone_home: z.string().max(20).optional().nullable(),
  postal_address_line1: z.string().max(255).optional().nullable(),
  postal_address_line2: z.string().max(255).optional().nullable(),
  postal_suburb: z.string().max(100).optional().nullable(),
  postal_state: z.string().max(3).optional().nullable(),
  postal_postcode: z.string().max(4).optional().nullable(),
  correspondence_method: z.enum(['email', 'postal', 'both']).optional(),
  notes: z.string().max(2000).optional().nullable(),
})

export type UpdateOwnerProfileData = z.infer<typeof updateProfileSchema>

/**
 * Update the owner's own contact details.
 * Email changes are NOT allowed through this action (requires separate verification).
 */
export async function updateOwnerProfile(data: UpdateOwnerProfileData) {
  const parsed = updateProfileSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const result = await getOwnerAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { owner, supabase } = result as Exclude<typeof result, { error: string }>

  // Build update payload (only include provided fields)
  const updatePayload: Record<string, unknown> = {}
  const providedData = parsed.data
  if (providedData.phone_mobile !== undefined) updatePayload.phone_mobile = providedData.phone_mobile
  if (providedData.phone_home !== undefined) updatePayload.phone_home = providedData.phone_home
  if (providedData.postal_address_line1 !== undefined) updatePayload.postal_address_line1 = providedData.postal_address_line1
  if (providedData.postal_address_line2 !== undefined) updatePayload.postal_address_line2 = providedData.postal_address_line2
  if (providedData.postal_suburb !== undefined) updatePayload.postal_suburb = providedData.postal_suburb
  if (providedData.postal_state !== undefined) updatePayload.postal_state = providedData.postal_state
  if (providedData.postal_postcode !== undefined) updatePayload.postal_postcode = providedData.postal_postcode
  if (providedData.correspondence_method !== undefined) updatePayload.correspondence_method = providedData.correspondence_method
  if (providedData.notes !== undefined) updatePayload.notes = providedData.notes

  if (Object.keys(updatePayload).length === 0) {
    return { error: 'No fields to update' }
  }

  const { data: updated, error } = await supabase
    .from('owners')
    .update(updatePayload)
    .eq('id', owner.id)
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/owner/profile')
  return { data: updated }
}
