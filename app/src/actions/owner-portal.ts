'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getResendClient } from '@/lib/email/resend'
import {
  buildOwnerInviteEmailHtml,
  buildOwnerInviteEmailText,
} from '@/lib/email/owner-invite-template'
import { createActivationToken } from '@/lib/activation-token'
import { revalidatePath } from 'next/cache'

async function getAuth() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' as const }
  return { user, supabase }
}

export async function inviteOwnerToPortal(ownerId: string) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase, user } = result as Exclude<typeof result, { error: string }>

  // Fetch the owner with lot info
  const { data: owner, error: ownerError } = await supabase
    .from('owners')
    .select(
      '*, lot_ownerships(lot_id, lots(id, lot_number, unit_number, scheme_id, schemes(id, scheme_name, organisation_id)))'
    )
    .eq('id', ownerId)
    .single()

  if (ownerError || !owner) {
    return { error: 'Owner not found' }
  }

  if (!owner.email) {
    return { error: 'Owner must have an email address to be invited to the portal' }
  }

  if (owner.portal_user_id) {
    return { error: 'Owner has already been invited to the portal' }
  }

  // Get the first lot/scheme for context
  const ownerships = owner.lot_ownerships as Array<{
    lot_id: string
    lots: {
      id: string
      lot_number: string
      unit_number: string | null
      scheme_id: string
      schemes: { id: string; scheme_name: string; organisation_id: string }
    } | null
  }>
  const firstOwnership = ownerships?.[0]
  const lot = firstOwnership?.lots
  const scheme = lot?.schemes

  if (!scheme) {
    return { error: 'Owner is not assigned to any lot in a scheme' }
  }

  // Verify the manager belongs to the same organisation
  const { data: orgUser } = await supabase
    .from('organisation_users')
    .select('organisation_id, role')
    .eq('user_id', user.id)
    .eq('organisation_id', scheme.organisation_id)
    .single()

  if (!orgUser) {
    return { error: 'You do not have permission to invite owners for this scheme' }
  }

  // Fetch organisation name for the email (F28: anti-phishing)
  const { data: org } = await supabase
    .from('organisations')
    .select('name')
    .eq('id', scheme.organisation_id)
    .single()
  const organisationName = org?.name ?? undefined

  // Create auth user for the owner using admin client
  const adminSupabase = createAdminClient()

  // F10: Try to create the user first. If they already exist, Supabase returns
  // a 422 error, and we do a small scoped lookup instead of listing all users.
  let portalUserId: string

  const { data: newUser, error: createError } =
    await adminSupabase.auth.admin.createUser({
      email: owner.email,
      email_confirm: true,
      user_metadata: {
        first_name: owner.first_name,
        last_name: owner.last_name,
        role: 'owner',
      },
    })

  if (createError) {
    if (createError.message?.includes('already been registered') || createError.status === 422) {
      // User already exists — query auth.users directly via service role (scoped by email)
      const { data: existingAuthUser } = await adminSupabase
        .schema('auth')
        .from('users')
        .select('id')
        .eq('email', owner.email.toLowerCase())
        .limit(1)
        .maybeSingle()
      if (!existingAuthUser) {
        return { error: 'Failed to locate existing user account' }
      }
      portalUserId = existingAuthUser.id
    } else {
      return { error: `Failed to create portal account: ${createError.message}` }
    }
  } else if (!newUser.user) {
    return { error: 'Failed to create portal account: Unknown error' }
  } else {
    portalUserId = newUser.user.id
  }

  // Update the owner record with portal_user_id and invite timestamp
  const { error: updateError } = await supabase
    .from('owners')
    .update({
      portal_user_id: portalUserId,
      portal_invite_sent_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq('id', ownerId)

  if (updateError) {
    return { error: `Failed to update owner record: ${updateError.message}` }
  }

  // Get manager name for email
  const managerName =
    user.user_metadata?.full_name ||
    (user.user_metadata?.first_name
      ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`
      : user.email || 'Your Strata Manager')

  // Build activation URL with HMAC-signed token (F3)
  const activationToken = createActivationToken(ownerId, portalUserId)

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const activationUrl = `${baseUrl}/owner/activate?token=${activationToken}`

  const lotLabel = lot?.unit_number
    ? `Unit ${lot.unit_number}`
    : `Lot ${lot?.lot_number || '?'}`

  // Send invitation email via Resend
  const resend = getResendClient()
  if (resend) {
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'LevyLite <noreply@levylite.com.au>',
        to: owner.email,
        subject: `You're invited to the ${scheme.scheme_name} owner portal`,
        html: buildOwnerInviteEmailHtml({
          ownerName: `${owner.first_name} ${owner.last_name}`,
          schemeName: scheme.scheme_name,
          lotNumber: lotLabel,
          managerName: managerName.trim(),
          activationUrl,
          organisationName,
        }),
        text: buildOwnerInviteEmailText({
          ownerName: `${owner.first_name} ${owner.last_name}`,
          schemeName: scheme.scheme_name,
          lotNumber: lotLabel,
          managerName: managerName.trim(),
          activationUrl,
          organisationName,
        }),
      })
    } catch (emailError) {
      console.error('[owner-portal] Failed to send invitation email:', emailError)
      // Don't fail the overall operation - the portal_user_id is already set
    }
  }

  // Revalidate the scheme page
  revalidatePath(`/schemes/${scheme.id}`)

  return { data: { portalUserId, email: owner.email } }
}

export async function resendPortalInvitation(ownerId: string) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase, user } = result as Exclude<typeof result, { error: string }>

  // Fetch owner with lot/scheme info
  const { data: owner, error: ownerError } = await supabase
    .from('owners')
    .select(
      '*, lot_ownerships(lot_id, lots(id, lot_number, unit_number, scheme_id, schemes(id, scheme_name, organisation_id)))'
    )
    .eq('id', ownerId)
    .single()

  if (ownerError || !owner) {
    return { error: 'Owner not found' }
  }

  if (!owner.portal_user_id) {
    return { error: 'Owner has not been invited yet. Use "Invite to Portal" first.' }
  }

  if (!owner.email) {
    return { error: 'Owner must have an email address' }
  }

  const ownerships = owner.lot_ownerships as Array<{
    lot_id: string
    lots: {
      id: string
      lot_number: string
      unit_number: string | null
      scheme_id: string
      schemes: { id: string; scheme_name: string; organisation_id: string }
    } | null
  }>
  const firstOwnership = ownerships?.[0]
  const lot = firstOwnership?.lots
  const scheme = lot?.schemes

  if (!scheme) {
    return { error: 'Owner is not assigned to any lot in a scheme' }
  }

  // F34: Rate limit — reject if the last invite was sent less than 1 hour ago
  if (owner.portal_invite_sent_at) {
    const lastSent = new Date(owner.portal_invite_sent_at)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    if (lastSent > oneHourAgo) {
      const minutesRemaining = Math.ceil((lastSent.getTime() + 60 * 60 * 1000 - Date.now()) / 60000)
      return { error: `Please wait before resending the invitation. You can resend in approximately ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}.` }
    }
  }

  // Fetch organisation name for the email (F28: anti-phishing)
  const { data: resendOrg } = await supabase
    .from('organisations')
    .select('name')
    .eq('id', scheme.organisation_id)
    .single()
  const resendOrgName = resendOrg?.name ?? undefined

  // Update invite timestamp
  const { error: updateError } = await supabase
    .from('owners')
    .update({
      portal_invite_sent_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq('id', ownerId)

  if (updateError) {
    return { error: `Failed to update owner record: ${updateError.message}` }
  }

  const managerName =
    user.user_metadata?.full_name ||
    (user.user_metadata?.first_name
      ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`
      : user.email || 'Your Strata Manager')

  // F3: HMAC-signed activation token
  const activationToken = createActivationToken(ownerId, owner.portal_user_id)

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const activationUrl = `${baseUrl}/owner/activate?token=${activationToken}`

  const lotLabel = lot?.unit_number
    ? `Unit ${lot.unit_number}`
    : `Lot ${lot?.lot_number || '?'}`

  const resend = getResendClient()
  if (resend) {
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'LevyLite <noreply@levylite.com.au>',
        to: owner.email,
        subject: `You're invited to the ${scheme.scheme_name} owner portal`,
        html: buildOwnerInviteEmailHtml({
          ownerName: `${owner.first_name} ${owner.last_name}`,
          schemeName: scheme.scheme_name,
          lotNumber: lotLabel,
          managerName: managerName.trim(),
          activationUrl,
          organisationName: resendOrgName,
        }),
        text: buildOwnerInviteEmailText({
          ownerName: `${owner.first_name} ${owner.last_name}`,
          schemeName: scheme.scheme_name,
          lotNumber: lotLabel,
          managerName: managerName.trim(),
          activationUrl,
          organisationName: resendOrgName,
        }),
      })
    } catch (emailError) {
      console.error('[owner-portal] Failed to resend invitation email:', emailError)
      return { error: 'Failed to send invitation email' }
    }
  }

  revalidatePath(`/schemes/${scheme.id}`)

  return { data: { email: owner.email } }
}
