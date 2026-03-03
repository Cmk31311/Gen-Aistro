import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Protected routes that require authentication
  const protectedPaths = ['/datasets', '/dashboard'];
  const isProtected = protectedPaths.some(p => pathname.startsWith(p));

  if (!isProtected) {
    return NextResponse.next();
  }

  // Check for Supabase auth token in cookies
  // Supabase stores session as sb-<project-ref>-auth-token
  const cookies = request.cookies.getAll();
  const hasAuthCookie = cookies.some(c => c.name.includes('auth-token') || c.name.includes('sb-'));

  if (!hasAuthCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/datasets/:path*', '/dashboard/:path*'],
};
