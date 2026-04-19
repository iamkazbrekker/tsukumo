import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // If user is trying to access dashboard or its subroutes
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    const authCookie = request.cookies.get('tsukumo_auth');
    
    // If no auth cookie is present, redirect to login (root)
    if (!authCookie?.value) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // If user is accessing the root / and already has the auth cookie, redirect to dashboard
  if (request.nextUrl.pathname === '/') {
     const authCookie = request.cookies.get('tsukumo_auth');
     if (authCookie?.value) {
       return NextResponse.redirect(new URL('/dashboard', request.url));
     }
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    '/',
    '/dashboard/:path*',
  ],
};
