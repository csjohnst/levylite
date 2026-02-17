import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Public routes that don't require auth
  const publicRoutes = ['/login', '/signup', '/auth/callback', '/auth/confirm', '/owner/login', '/owner/activate']
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  )

  const isOwnerRoute = pathname.startsWith('/owner')

  // Redirect unauthenticated users to appropriate login page
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = isOwnerRoute ? '/owner/login' : '/login'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from auth pages
  if (user && (pathname === '/login' || pathname === '/signup')) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from owner login
  if (user && pathname === '/owner/login') {
    // Check if this user is an owner
    const { data: ownerRecord } = await supabase
      .from('owners')
      .select('id')
      .eq('portal_user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()

    const url = request.nextUrl.clone()
    if (ownerRecord) {
      url.pathname = '/owner'
      return NextResponse.redirect(url)
    }
    // Not an owner, redirect to staff dashboard
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // For authenticated owner portal routes (except public ones), verify the user is an owner
  if (user && isOwnerRoute && !isPublicRoute) {
    const { data: ownerRecord } = await supabase
      .from('owners')
      .select('id')
      .eq('portal_user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()

    if (!ownerRecord) {
      // Not an owner - redirect to staff dashboard
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
