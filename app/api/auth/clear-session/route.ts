import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/authOptions';

// POST - Clear session (for debugging)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    console.log('Current session state:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
    });

    // Return a response that will clear the client-side session
    const response = NextResponse.json({
      message: 'Session cleared',
      sessionState: {
        hasSession: !!session,
        hasUser: !!session?.user,
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
} 