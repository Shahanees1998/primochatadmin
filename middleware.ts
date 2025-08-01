import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AuthService } from '@/lib/auth';

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

  // Allow access to public paths
  if (ignorePaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Check if user is authenticated
  const token = AuthService.getTokenFromRequest(req);  
  // Protect admin routes (both frontend and API)
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (!token) {
      // For API routes, return 401 instead of redirecting
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status:401}
        );
      }
      
      // For frontend routes, redirect to login
      const loginUrl = new URL('/auth/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      // Verify the token
      await AuthService.verifyToken(token);
      
      // Check if user has admin role
      // if (payload.role !== 'ADMIN') {
      //   // For API routes, return 403 instead of redirecting
      //   if (pathname.startsWith('/api/')) {
      //     return NextResponse.json(
      //       { error: 'Admin access required' },
      //       { status: 403}
      //     );
      //   }
        
      //   // For frontend routes, redirect to access denied
      //   return NextResponse.redirect(new URL('/auth/access', req.url));
      // }
    } catch (error) {
      // Token is invalid or expired      
      // Clear invalid tokens
      console.log('>>>>> error')
      const response = pathname.startsWith('/api/')
        ? NextResponse.json(
            { error: 'Invalid or expired token' },
            { status: 401 }
          )
        : NextResponse.redirect(new URL('/auth/login', req.url));
      
      // Clear cookies for both API and frontend responses
      response.cookies.delete('access_token');
      response.cookies.delete('refresh_token');
      
      // For frontend routes, add callback URL
      if (!pathname.startsWith('/api/')) {
        const loginUrl = new URL('/auth/login', req.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
      }
      
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico|auth/login|auth/error|auth/forgotpassword|auth/reset-password).*)',
  ],
};
