import { NextRequest, NextResponse } from 'next/server';
import { AuthService, JWTPayload } from './auth';

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload;
}

/**
 * Middleware to protect API routes
 * Validates JWT token from cookies (web) or Authorization header (mobile)
 */
export async function withAuth(
  req: NextRequest,
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const token = AuthService.getTokenFromRequest(req);
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify the token
    const payload = await AuthService.verifyToken(token);
    
    // Add user to request
    const authenticatedReq = req as AuthenticatedRequest;
    authenticatedReq.user = payload;

    return await handler(authenticatedReq);
  } catch (error) {
    // If token is expired, try to refresh it
    if (error instanceof Error && error.message === 'Invalid token') {
      const refreshToken = AuthService.getRefreshTokenFromCookies();
      
      if (refreshToken) {
        try {
          const newAccessToken = await AuthService.refreshAccessToken(refreshToken);
          
          // Set new access token in cookie
          const response = await handler(req as AuthenticatedRequest);
          const isProd = process.env.NODE_ENV === 'production';
          // Add the new token to the response
          response.cookies.set('access_token', newAccessToken, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
            path: '/',
          });
          
          return response;
        } catch (refreshError) {
          // Refresh token is also invalid, clear cookies and return 401
          const response = NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
          );
          
          response.cookies.delete('access_token');
          response.cookies.delete('refresh_token');
          
          return response;
        }
      }
    }
    
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }
}

/**
 * Middleware to protect admin routes
 * Requires authentication and admin role
 */
export async function withAdminAuth(
  req: NextRequest,
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  return withAuth(req, async (authenticatedReq) => {
    const user = authenticatedReq.user;
    
    if (!user) {
      return NextResponse.json(
        { error: 'You are unauthorized to access this page' },
        { status: 403 }
      );
    }

    return await handler(authenticatedReq);
  });
}

/**
 * Optional auth middleware - doesn't fail if no token, but adds user if present
 */
export async function withOptionalAuth(
  req: NextRequest,
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const token = AuthService.getTokenFromRequest(req);
    
    if (token) {
      const payload = await AuthService.verifyToken(token);
      const authenticatedReq = req as AuthenticatedRequest;
      authenticatedReq.user = payload;
      return await handler(authenticatedReq);
    }
  } catch (error) {
    // Ignore auth errors for optional auth
  }

  return await handler(req as AuthenticatedRequest);
} 