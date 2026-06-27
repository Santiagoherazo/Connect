import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isProtected = pathname.startsWith('/map') ||
    pathname.startsWith('/pin') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/friends')

  const isAuthRoute = pathname.startsWith('/login') ||
    pathname.startsWith('/signup')

  if (!isProtected && !isAuthRoute) {
    return NextResponse.next()
  }

  // Guard: si no hay env vars, dejar pasar sin auth check
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('[Parche proxy] Missing Supabase env vars')
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    })

    const { data: { user } } = await supabase.auth.getUser()

    if (!user && isProtected) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    if (user && isAuthRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/map'
      return NextResponse.redirect(url)
    }

    return response
  } catch (err) {
    console.error('[Parche proxy] Auth error:', err)
    // No crashear — dejar pasar
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|api/).*)',
  ],
}
