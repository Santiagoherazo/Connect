import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const PUBLIC_PATHS = ['/login', '/signup', '/callback']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p))

  // Sin env vars → bloquear rutas protegidas
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    if (!isPublic) return NextResponse.redirect(new URL('/login', request.url))
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })

  try {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    })

    const { data: { user }, error } = await supabase.auth.getUser()
    const hasSession = !!user && !error

    if (!hasSession && !isPublic) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }

    if (hasSession && isPublic && !pathname.startsWith('/callback')) {
      return NextResponse.redirect(new URL('/map', request.url))
    }

    return response
  } catch {
    // Si Supabase falla, redirigir a login por seguridad
    if (!isPublic) return NextResponse.redirect(new URL('/login', request.url))
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|icons|offline\\.html|cordova.*\\.js|api/).*)',
  ],
}
