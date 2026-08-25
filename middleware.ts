import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const publicPaths = ['/', '/login', '/signup', '/onboarding/farmer', '/onboarding/buyer']

function isPublic(pathname: string): boolean {
  if (publicPaths.includes(pathname)) return true
  if (pathname.startsWith('/api/')) return true
  return false
}

function copySupabaseCookies(
  from: NextResponse,
  to: NextResponse
): void {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie.name, cookie.value, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
  })
}

export async function middleware(request: NextRequest) {
  try {
    const { supabaseResponse, user } = await updateSession(request)
    const pathname = request.nextUrl.pathname

    // Public routes: allow through, but redirect logged-in users away from /login and /signup
    if (isPublic(pathname)) {
      if (user && (pathname === '/login' || pathname === '/signup')) {
        const role = user.user_metadata?.role as string | undefined
        let dest = '/dashboard'
        if (role === 'buyer') dest = '/buyer/browse'
        else if (role === 'admin') dest = '/admin'
        else if (role === 'fpo_admin') dest = '/fpo/pool'

        const redirectRes = NextResponse.redirect(new URL(dest, request.url))
        copySupabaseCookies(supabaseResponse, redirectRes)
        return redirectRes
      }
      return supabaseResponse
    }

    // Protected routes: redirect unauthenticated users to /login
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirectTo', pathname)
      const redirectRes = NextResponse.redirect(url)
      copySupabaseCookies(supabaseResponse, redirectRes)
      return redirectRes
    }

    // Authenticated user on a protected route — pass through
    return supabaseResponse
  } catch (e) {
    // If middleware crashes for any reason, let the request through
    // rather than showing a blank page
    console.error('Middleware error:', e)
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
