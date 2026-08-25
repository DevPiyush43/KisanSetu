import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const publicRoutes = ['/', '/login', '/signup', '/onboarding/farmer', '/onboarding/buyer']

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)
  const pathname = request.nextUrl.pathname

  // 1. Allow public routes and API endpoints
  if (publicRoutes.some(r => pathname === r || pathname.startsWith('/api/'))) {
    // If logged in and visiting login or signup, redirect to dashboard
    if (user && (pathname === '/login' || pathname === '/signup')) {
      const userRole = user.user_metadata?.role
      const dest = userRole === 'buyer' ? '/buyer/browse' : userRole === 'admin' ? '/admin' : '/dashboard'
      const redirectRes = NextResponse.redirect(new URL(dest, request.url))
      supabaseResponse.cookies.getAll().forEach(c => redirectRes.cookies.set(c.name, c.value, c))
      return redirectRes
    }
    return supabaseResponse
  }

  // 2. Not logged in → redirect to login with cookies preserved
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', pathname)
    const redirectRes = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach(c => redirectRes.cookies.set(c.name, c.value, c))
    return redirectRes
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
