// TODO: F13 — Add production-grade rate limiting (e.g., @upstash/ratelimit for serverless).
// In-memory rate limiter applied below is suitable for single-instance deployments only.

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyActivationToken } from '@/lib/activation-token'
import { validatePassword } from '@/lib/password-validation'
import { checkRateLimit } from '@/lib/rate-limit'
import { validateRequestOrigin } from '@/lib/validate-origin'

// Rate limit: 5 activation attempts per IP per 15 minutes
const RATE_LIMIT_CONFIG = { maxRequests: 5, windowMs: 15 * 60 * 1000 }

export async function POST(request: Request) {
  try {
    // F27: CSRF origin validation
    const originCheck = validateRequestOrigin(request)
    if (!originCheck.valid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Apply rate limiting by IP
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded?.split(',')[0]?.trim() ?? 'unknown'
    const rateLimitResult = checkRateLimit(`activate:${ip}`, RATE_LIMIT_CONFIG)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil(rateLimitResult.retryAfterMs / 1000)) },
        }
      )
    }

    const { token, password } = await request.json()

    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 })
    }

    // F17: Validate password strength
    const passwordCheck = validatePassword(password ?? '')
    if (!passwordCheck.valid) {
      return NextResponse.json(
        { error: passwordCheck.message },
        { status: 400 }
      )
    }

    // F3: Verify HMAC-signed token (includes expiry check at 48h)
    let decoded: { ownerId: string; portalUserId: string; ts: number }
    try {
      decoded = verifyActivationToken(token)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid activation token'
      return NextResponse.json(
        { error: message },
        { status: 400 }
      )
    }

    const adminSupabase = createAdminClient()

    // Fetch the owner record
    const { data: owner, error: ownerError } = await adminSupabase
      .from('owners')
      .select('id, portal_user_id, portal_invite_accepted_at')
      .eq('id', decoded.ownerId)
      .single()

    if (ownerError || !owner) {
      return NextResponse.json(
        { error: 'Invalid activation token' },
        { status: 400 }
      )
    }

    if (!owner.portal_user_id) {
      return NextResponse.json(
        { error: 'No portal invitation found. Please contact your strata manager.' },
        { status: 400 }
      )
    }

    // F3: Reject if already activated (single-use token)
    if (owner.portal_invite_accepted_at) {
      return NextResponse.json(
        { error: 'This account has already been activated. Please log in instead.' },
        { status: 400 }
      )
    }

    // Set the password on the auth user via admin API
    const { error: updateUserError } = await adminSupabase.auth.admin.updateUserById(
      decoded.portalUserId,
      { password }
    )

    if (updateUserError) {
      return NextResponse.json(
        { error: 'Failed to activate account. Please try again or contact your strata manager.' },
        { status: 500 }
      )
    }

    // Mark as activated (this also makes the token single-use)
    const { error: updateError } = await adminSupabase
      .from('owners')
      .update({
        portal_invite_accepted_at: new Date().toISOString(),
        portal_activated_at: new Date().toISOString(),
      })
      .eq('id', decoded.ownerId)

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to activate account' },
        { status: 500 }
      )
    }

    // F3: Do NOT return the email address in the response
    return NextResponse.json({
      activated: true,
    })
  } catch (err) {
    console.error('[api/owner/activate] Error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
