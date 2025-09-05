import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { LCMService } from '@/lib/lcmService';

export const dynamic = 'force-dynamic';

// POST /api/lcm/unregister - Unregister device token for push notifications
export async function POST(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const { token } = await request.json();

      if (!token) {
        return NextResponse.json(
          { error: 'Token is required' },
          { status: 400 }
        );
      }

      await LCMService.unregisterDeviceToken(authenticatedReq.user!.userId, token);

      return NextResponse.json({
        success: true,
        message: 'Device token unregistered successfully'
      });
    } catch (error) {
      console.error('Unregister device token error:', error);
      return NextResponse.json(
        { error: 'Failed to unregister device token' },
        { status: 500 }
      );
    }
  });
}
