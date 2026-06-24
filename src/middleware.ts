import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const PUBLIC_PATHS = ['/login', '/signup', '/callback']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p))

  // Si no están las env vars configuradas en Vercel, bloquear todo excepto auth
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    if (!isPublic) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next()
  }

  const response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value)
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  // IMPORTANTE: getUser() valida el token con Supabase server-side
  // nunca confiar solo en la sesión local del cliente
  const { data: { user }, error } = await supabase.auth.getUser()

  const hasSession = !!user && !error

  if (!hasSession && !isPublic) {
    // No autenticado → login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (hasSession && isPublic && !pathname.startsWith('/callback')) {
    // Ya autenticado → mapa
    return NextResponse.redirect(new URL('/map', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|icons|offline\\.html|cordova.*\\.js).*)',
  ],
}
