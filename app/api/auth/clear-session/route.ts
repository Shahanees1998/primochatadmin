import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';

// POST - Clear session (for debugging)
export async function POST(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      console.log('Current session state:', {
        hasSession: !!authenticatedReq.user,
        hasUser: !!authenticatedReq.user,
        userId: authenticatedReq.user?.userId,
      });

      // Return a response that will clear the client-side session
      const response = NextResponse.json({
        message: 'Session cleared',
        sessionState: {
          hasSession: !!authenticatedReq.user,
          hasUser: !!authenticatedReq.user,
        }
      });

      // Clear the session cookie
      response.cookies.delete('next-auth.session-token');
      response.cookies.delete('__Secure-next-auth.session-token');
      response.cookies.delete('next-auth.csrf-token');
      response.cookies.delete('__Host-next-auth.csrf-token');
      response.cookies.delete('next-auth.callback-url');
      response.cookies.delete('__Secure-next-auth.callback-url');

      return response;
    } catch (error) {
      console.error('Error clearing session:', error);
      return NextResponse.json(
        { error: 'Failed to clear session', details: error },
        { status: 500 }
      );
    }
  });
} 