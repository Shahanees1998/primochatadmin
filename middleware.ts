import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

const ignorePaths: string[] = [
  '/api/auth',
  '/auth',
  '/_next',
  '/favicon.ico',
  '/api/webhook',
  '/api/public',
  '/public',
];

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const host = req.headers.get('host');

  // Redirect app.siing.io to siing.io
  if (host === 'app.siing.io') {
    return NextResponse.redirect('https://siing.io');
  }

  // Allow access to public paths
  if (ignorePaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Check if user is authenticated
  const token = await getToken({ 
    req,
    secret: process.env.NEXTAUTH_SECRET || '6ac1ce8466e02c6383fb70103b51cdffd9cb3394970606ef0b2e2835afe77a7e'
  });
  // If accessing admin routes, check for admin role
  // if(token == null){
  //   return NextResponse.redirect(new URL('/auth/login', req.url));
  // }
  if (pathname.startsWith('/admin')) {
    if (token == null) {
      // Redirect to login if not authenticated
      const loginUrl = new URL('/auth/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Check if user has admin role
    if (token.role !== 'ADMIN') {
      // Redirect to access denied page
      return NextResponse.redirect(new URL('/auth/access', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico|auth/login|auth/error|auth/forgotpassword|auth/reset-password).*)',
  ],
};
