import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AuthService } from '@/lib/auth';
import { canAccessSection, getDefaultRedirectPath, isAdminRole } from '@/lib/rolePermissions';

const ignorePaths: string[] = [
  '/api/auth',
  '/auth',
  '/_next',
  '/favicon.ico',
  '/api/webhook',
  '/api/public',
  '/public',
];

function getSectionFromPath(pathname: string): string | null {
  // Extract section from admin paths like /admin/festive-board, /admin/trestle-board, etc.
  const adminMatch = pathname.match(/^\/admin\/([^\/]+)/);
  if (adminMatch) {
    const section = adminMatch[1];
    // Map path sections to permission keys
    const sectionMap: Record<string, string> = {
      'festive-board': 'canAccessFestiveBoard',
      'trestle-board': 'canAccessTrestleBoard',
      'documents': 'canAccessDocuments',
      'users': 'canAccessUsers',
      'settings': 'canAccessSettings',
      'support': 'canAccessSupport',
      'lcm-test': 'canAccessLCMTest',
    };
    return sectionMap[section] || null;
  }
  
  // Check for nested paths like /admin/communications/announcements
  const nestedMatch = pathname.match(/^\/admin\/communications\/([^\/]+)/);
  if (nestedMatch) {
    const section = nestedMatch[1];
    const nestedSectionMap: Record<string, string> = {
      'announcements': 'canAccessAnnouncements',
    };
    return nestedSectionMap[section] || null;
  }
  
  return null;
}

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
      const payload = await AuthService.verifyToken(token);
      
      // Check if user has admin role
      if (!isAdminRole(payload.role)) {
        // For API routes, return 403 instead of redirecting
        if (pathname.startsWith('/api/')) {
          return NextResponse.json(
            { error: 'Admin access required' },
            { status: 403}
          );
        }
        
        // For frontend routes, redirect to access denied
        return NextResponse.redirect(new URL('/auth/access', req.url));
      }

      // Check role-based access for specific sections
      if (!pathname.startsWith('/api/')) {
        // Check if accessing main dashboard
        if (pathname === '/admin') {
          if (!canAccessSection(payload.role, 'canAccessAll')) {
            // Redirect to user's allowed section
            const redirectPath = getDefaultRedirectPath(payload.role);
            return NextResponse.redirect(new URL(redirectPath, req.url));
          }
        } else {
          // Check specific sections
          const section = getSectionFromPath(pathname);
          if (section && !canAccessSection(payload.role, section)) {
            // Redirect to user's allowed section
            const redirectPath = getDefaultRedirectPath(payload.role);
            return NextResponse.redirect(new URL(redirectPath, req.url));
          }
        }
      }
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
