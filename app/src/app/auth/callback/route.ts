import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // If the caller specified a next URL, use it
      if (next && next !== '/') {
        return NextResponse.redirect(`${origin}${next}`)
      }

      // Otherwise, determine where to redirect based on user type
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        // Check if user is a staff member (organisation_users)
        const { data: orgUser } = await supabase
          .from('organisation_users')
          .select('id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle()

        if (orgUser) {
          return NextResponse.redirect(`${origin}/`)
        }

        // Check if user is an owner (owners.portal_user_id)
        const { data: ownerRecord } = await supabase
          .from('owners')
          .select('id')
          .eq('portal_user_id', user.id)
          .limit(1)
          .maybeSingle()

        if (ownerRecord) {
          return NextResponse.redirect(`${origin}/owner`)
        }
      }

      // Fallback to default redirect
      return NextResponse.redirect(`${origin}/`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
