import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SITE_PASSWORD = process.env.SITE_PASSWORD || '';

function getAuthToken(): string {
  return btoa(encodeURIComponent(`nishi_${SITE_PASSWORD}_auth`));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth for login page, auth API, and static assets
  if (
    pathname === '/login' ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Check auth cookie
  const authCookie = request.cookies.get('nishi_auth');
  if (authCookie?.value === getAuthToken()) {
    return NextResponse.next();
  }

  // Redirect to login
  return NextResponse.redirect(new URL('/login', request.url));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
