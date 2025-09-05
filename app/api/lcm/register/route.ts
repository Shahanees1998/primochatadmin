import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { LCMService, LCMDeviceInfo } from '@/lib/lcmService';

export const dynamic = 'force-dynamic';

// POST /api/lcm/register - Register device token for push notifications
export async function POST(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const { token, platform, appVersion, deviceModel, osVersion } = await request.json();

      if (!token || !platform) {
        return NextResponse.json(
          { error: 'Token and platform are required' },
          { status: 400 }
        );
      }

      if (!['ios', 'android', 'web'].includes(platform)) {
        return NextResponse.json(
          { error: 'Platform must be ios, android, or web' },
          { status: 400 }
        );
      }

      const deviceInfo: LCMDeviceInfo = {
        token,
        platform: platform as 'ios' | 'android' | 'web',
        appVersion,
        deviceModel,
        osVersion
      };

      await LCMService.registerDeviceToken(authenticatedReq.user!.userId, deviceInfo);

      return NextResponse.json({
        success: true,
        message: 'Device token registered successfully'
      });
    } catch (error) {
      console.error('Register device token error:', error);
      return NextResponse.json(
        { error: 'Failed to register device token' },
        { status: 500 }
      );
    }
  });
}
