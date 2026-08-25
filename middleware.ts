import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'

const publicRoutes = ['/', '/login', '/signup', '/onboarding/farmer', '/onboarding/buyer']

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)
  const pathname = request.nextUrl.pathname

  // Allow public routes
  if (publicRoutes.some(r => pathname === r || pathname.startsWith('/api/'))) {
    return supabaseResponse
  }

  // Not logged in → redirect to login
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  // Get role for protected route guards
  const cookieStore = request.cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_suspended')
    .eq('id', user.id)
    .single()

  if (profile?.is_suspended) {
    const url = request.nextUrl.clone()
    url.pathname = '/suspended'
    return NextResponse.redirect(url)
  }

  const role = profile?.role

  // Admin-only routes
  if (pathname.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Buyer-only routes
  if (pathname.startsWith('/buyer') && role !== 'buyer') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // FPO-only routes
  if (pathname.startsWith('/fpo') && role !== 'fpo_admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Logged in users away from auth pages
  if ((pathname === '/login' || pathname === '/signup') && user) {
    const dest = role === 'buyer' ? '/buyer/browse' : role === 'admin' ? '/admin' : '/dashboard'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
