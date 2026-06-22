import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isProtected = pathname.startsWith('/map') ||
    pathname.startsWith('/pin') ||
    pathname.startsWith('/profile')

  const isAuthRoute = pathname.startsWith('/login') ||
    pathname.startsWith('/signup')

  if (!isProtected && !isAuthRoute) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
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
      }
    )

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
  } catch {
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|api/).*)',
  ],
}
