import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('saas_dashboard_token')?.value
  const isLoginPage = request.nextUrl.pathname === '/'
  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard')

  if (isDashboard && !token) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (isLoginPage && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/dashboard/:path*']
}
