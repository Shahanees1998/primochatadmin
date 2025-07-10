import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

const ignorePaths: string[] = [
  '/api/updatepassword',
  '/api/verifyOtp',
  '/api/populate-db',
  '/api/login',
  '/api/send-invites',
  '/api/verifyToken',
  '/api/public/',
  '/public/',
  '/api/s3',
  '/api/emails',
  'auth/signup',
  'auth/signin',
  'auth/reset-password',
  'auth/forget-password',
];

export async function middleware(req: NextRequest) {
  const token = await getToken({ req });
  const tokenHeader = req.headers.get('token');
  const pathname = req.nextUrl.pathname;
  const host = req.headers.get('host');
  // const protocol = req.headers.get('x-forwarded-proto') || 'https';

  if (host == 'app.siing.io') {
    return NextResponse.redirect('https://siing.io');
  }

  if (ignorePaths.some((path) => pathname.indexOf(path) !== -1)) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/sync-users/')) {
    return NextResponse.next();
  }

  if (tokenHeader || token) {
    return NextResponse.next();
  }

  // const signInUrl = `${protocol}://${host}/auth/signin`;
  // return NextResponse.redirect(signInUrl);
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!auth|login|api/auth|_next/static|favicon.ico).*)'],
};
