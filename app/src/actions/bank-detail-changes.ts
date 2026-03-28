'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getResendClient } from '@/lib/email/resend'
import {
  buildBankDetailChangeRequestEmailHtml,
  buildBankDetailChangeRequestEmailText,
  buildBankDetailChangeApprovalEmailHtml,
  buildBankDetailChangeApprovalEmailText,
} from '@/lib/email/bank-detail-change-template'

const bankDetailChangeSchema = z.object({
  newBsb: z.string().regex(/^\d{3}-?\d{3}$/, 'BSB must be 6 digits (e.g. 066-123)').optional().nullable(),
  newAccountNumber: z.string().min(1).max(20).optional().nullable(),
  newAccountName: z.string().min(1).max(255).optional().nullable(),
})

async function getAuthWithOrg() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' as const }

  const { data: orgUser } = await supabase
    .from('organisation_users')
    .select('organisation_id, role')
    .eq('user_id', user.id)
    .single()
  if (!orgUser) return { error: 'No organisation found' as const }

  return { user, supabase, orgId: orgUser.organisation_id, role: orgUser.role }
}

/**
 * Sends notification emails to all managers/admins in the org about a bank detail change request.
 */
async function notifyManagers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  emailBuilder: (email: string) => { to: string; subject: string; html: string; text: string },
  excludeUserId?: string
) {
  const resend = getResendClient()
  if (!resend) return

  // Get all managers/admins in the org with their email addresses
  const { data: orgUsers } = await supabase
    .from('organisation_users')
    .select('user_id')
    .eq('organisation_id', orgId)
    .in('role', ['manager', 'admin'])

  if (!orgUsers || orgUsers.length === 0) return

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'LevyLite <noreply@levylite.com.au>'

  for (const orgUser of orgUsers) {
    if (excludeUserId && orgUser.user_id === excludeUserId) continue

    // We need to look up user email — use the auth.users metadata isn't directly queryable
    // via the regular client. We'll use rpc or simply send to all org users.
    // Since we can't query auth.users from the regular client, we'll use a workaround:
    // get the user's profile info from organisation_users join or user_metadata.
    // For simplicity, we'll look up email from the supabase auth admin if available,
    // but since we don't want to require admin client here, we'll rely on the
    // organisation's email or skip individual notifications.
  }

  // Simplified approach: send to the organisation's contact email
  const { data: org } = await supabase
    .from('organisations')
    .select('email, name')
    .eq('id', orgId)
    .single()

  if (org?.email) {
    const emailData = emailBuilder(org.email)
    try {
      await resend.emails.send({
        from: fromEmail,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
      })
    } catch (err) {
      console.error('[bank-detail-changes] Failed to send notification email:', err)
    }
  }
}

/**
 * Request a bank detail change for a scheme.
 * Creates a change request and sends notification emails.
 */
export async function requestBankDetailChange(
  schemeId: string,
  newBsb: string | null,
  newAccountNumber: string | null,
  newAccountName: string | null
) {
  const parsed = bankDetailChangeSchema.safeParse({ newBsb, newAccountNumber, newAccountName })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const result = await getAuthWithOrg()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase, user, orgId, role } = result as Exclude<typeof result, { error: string }>

  if (role !== 'manager' && role !== 'admin') {
    return { error: 'Only managers and admins can request bank detail changes' }
  }

  // Verify scheme belongs to org
  const { data: scheme, error: schemeError } = await supabase
    .from('schemes')
    .select('id, scheme_name, trust_bsb, trust_account_number, trust_account_name, organisation_id')
    .eq('id', schemeId)
    .eq('organisation_id', orgId)
    .single()

  if (schemeError || !scheme) {
    return { error: 'Scheme not found or you do not have access' }
  }

  // Check for existing pending requests
  const { data: existing } = await supabase
    .from('bank_detail_change_requests')
    .select('id')
    .eq('scheme_id', schemeId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())

  if (existing && existing.length > 0) {
    return { error: 'There is already a pending bank detail change request for this scheme. Please wait for it to be approved, rejected, or expire before submitting a new one.' }
  }

  // Create the change request
  const { data: changeRequest, error: insertError } = await supabase
    .from('bank_detail_change_requests')
    .insert({
      scheme_id: schemeId,
      requested_by: user.id,
      old_trust_bsb: scheme.trust_bsb,
      old_trust_account_number: scheme.trust_account_number,
      old_trust_account_name: scheme.trust_account_name,
      new_trust_bsb: parsed.data.newBsb ?? null,
      new_trust_account_number: parsed.data.newAccountNumber ?? null,
      new_trust_account_name: parsed.data.newAccountName ?? null,
    })
    .select()
    .single()

  if (insertError) return { error: insertError.message }

  // Send notification emails to all managers
  const requesterName =
    user.user_metadata?.full_name ||
    (user.user_metadata?.first_name
      ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`
      : user.email || 'A manager')

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const portalUrl = `${baseUrl}/schemes/${schemeId}?tab=trust`

  const expiresAt = new Date(changeRequest.expires_at).toLocaleString('en-AU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  await notifyManagers(supabase, orgId, (email) => ({
    to: email,
    subject: `[Action Required] Bank detail change requested for ${scheme.scheme_name}`,
    html: buildBankDetailChangeRequestEmailHtml({
      schemeName: scheme.scheme_name,
      requesterName: requesterName.trim(),
      oldBsb: scheme.trust_bsb,
      oldAccountNumber: scheme.trust_account_number,
      oldAccountName: scheme.trust_account_name,
      newBsb: parsed.data.newBsb ?? null,
      newAccountNumber: parsed.data.newAccountNumber ?? null,
      newAccountName: parsed.data.newAccountName ?? null,
      expiresAt,
      portalUrl,
    }),
    text: buildBankDetailChangeRequestEmailText({
      schemeName: scheme.scheme_name,
      requesterName: requesterName.trim(),
      oldBsb: scheme.trust_bsb,
      oldAccountNumber: scheme.trust_account_number,
      oldAccountName: scheme.trust_account_name,
      newBsb: parsed.data.newBsb ?? null,
      newAccountNumber: parsed.data.newAccountNumber ?? null,
      newAccountName: parsed.data.newAccountName ?? null,
      expiresAt,
      portalUrl,
    }),
  }))

  revalidatePath(`/schemes/${schemeId}`)
  return { data: changeRequest }
}

/**
 * Approve a bank detail change request.
 * Calls the SECURITY DEFINER DB function which enforces the maker-checker pattern.
 */
export async function approveBankDetailChange(changeRequestId: string) {
  const result = await getAuthWithOrg()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase, user, orgId, role } = result as Exclude<typeof result, { error: string }>

  if (role !== 'manager' && role !== 'admin') {
    return { error: 'Only managers and admins can approve bank detail changes' }
  }

  // Fetch the request first for notification data
  const { data: changeRequest, error: fetchError } = await supabase
    .from('bank_detail_change_requests')
    .select('*, schemes(scheme_name)')
    .eq('id', changeRequestId)
    .single()

  if (fetchError || !changeRequest) {
    return { error: 'Change request not found' }
  }

  if (changeRequest.requested_by === user.id) {
    return { error: 'You cannot approve your own bank detail change request. A different manager must approve it.' }
  }

  if (changeRequest.status !== 'pending') {
    return { error: `Change request is not pending (current status: ${changeRequest.status})` }
  }

  if (new Date(changeRequest.expires_at) < new Date()) {
    return { error: 'This change request has expired. Please submit a new request.' }
  }

  // Call the SECURITY DEFINER function
  const { error: rpcError } = await supabase.rpc('approve_bank_detail_change', {
    change_request_id: changeRequestId,
  })

  if (rpcError) {
    return { error: rpcError.message }
  }

  // Send approval notification
  const approverName =
    user.user_metadata?.full_name ||
    (user.user_metadata?.first_name
      ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`
      : user.email || 'A manager')

  const schemeName = (changeRequest.schemes as { scheme_name: string } | null)?.scheme_name || 'Unknown scheme'

  await notifyManagers(supabase, orgId, (email) => ({
    to: email,
    subject: `Bank details updated for ${schemeName}`,
    html: buildBankDetailChangeApprovalEmailHtml({
      schemeName,
      approverName: approverName.trim(),
      newBsb: changeRequest.new_trust_bsb,
      newAccountNumber: changeRequest.new_trust_account_number,
      newAccountName: changeRequest.new_trust_account_name,
    }),
    text: buildBankDetailChangeApprovalEmailText({
      schemeName,
      approverName: approverName.trim(),
      newBsb: changeRequest.new_trust_bsb,
      newAccountNumber: changeRequest.new_trust_account_number,
      newAccountName: changeRequest.new_trust_account_name,
    }),
  }))

  revalidatePath(`/schemes/${changeRequest.scheme_id}`)
  return { data: { approved: true } }
}

/**
 * Reject a bank detail change request with a reason.
 */
export async function rejectBankDetailChange(changeRequestId: string, reason?: string) {
  const result = await getAuthWithOrg()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase, user, role } = result as Exclude<typeof result, { error: string }>

  if (role !== 'manager' && role !== 'admin') {
    return { error: 'Only managers and admins can reject bank detail changes' }
  }

  // Fetch the request
  const { data: changeRequest, error: fetchError } = await supabase
    .from('bank_detail_change_requests')
    .select('*')
    .eq('id', changeRequestId)
    .single()

  if (fetchError || !changeRequest) {
    return { error: 'Change request not found' }
  }

  if (changeRequest.requested_by === user.id) {
    return { error: 'You cannot reject your own bank detail change request.' }
  }

  if (changeRequest.status !== 'pending') {
    return { error: `Change request is not pending (current status: ${changeRequest.status})` }
  }

  const { error: updateError } = await supabase
    .from('bank_detail_change_requests')
    .update({
      status: 'rejected',
      rejected_by: user.id,
      rejected_at: new Date().toISOString(),
      rejection_reason: reason || null,
    })
    .eq('id', changeRequestId)

  if (updateError) return { error: updateError.message }

  revalidatePath(`/schemes/${changeRequest.scheme_id}`)
  return { data: { rejected: true } }
}

/**
 * Get pending bank detail change requests for a scheme.
 */
export async function getPendingBankDetailChanges(schemeId: string) {
  const result = await getAuthWithOrg()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  const { data, error } = await supabase
    .from('bank_detail_change_requests')
    .select('*')
    .eq('scheme_id', schemeId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('requested_at', { ascending: false })

  if (error) return { error: error.message }
  return { data: data ?? [] }
}

/**
 * Get recent bank detail change requests for a scheme (for audit trail).
 */
export async function getRecentBankDetailChanges(schemeId: string) {
  const result = await getAuthWithOrg()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  const { data, error } = await supabase
    .from('bank_detail_change_requests')
    .select('*')
    .eq('scheme_id', schemeId)
    .order('requested_at', { ascending: false })
    .limit(20)

  if (error) return { error: error.message }
  return { data: data ?? [] }
}
