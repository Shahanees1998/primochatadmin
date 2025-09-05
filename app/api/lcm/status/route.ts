import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { LCMService } from '@/lib/lcmService';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/lcm/status - Get user's LCM notification status
export async function GET(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: authenticatedReq.user!.userId },
        select: {
          lcmEnabled: true,
          lcmDeviceTokens: true
        }
      });

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        enabled: user.lcmEnabled,
        deviceCount: user.lcmDeviceTokens.length,
        devices: user.lcmDeviceTokens
      });
    } catch (error) {
      console.error('Get LCM status error:', error);
      return NextResponse.json(
        { error: 'Failed to get LCM status' },
        { status: 500 }
      );
    }
  });
}

// PUT /api/lcm/status - Update user's LCM notification status
export async function PUT(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const { enabled } = await request.json();

      if (typeof enabled !== 'boolean') {
        return NextResponse.json(
          { error: 'Enabled field must be a boolean' },
          { status: 400 }
        );
      }

      await LCMService.setUserNotificationStatus(authenticatedReq.user!.userId, enabled);

      return NextResponse.json({
        success: true,
        message: `Push notifications ${enabled ? 'enabled' : 'disabled'} successfully`
      });
    } catch (error) {
      console.error('Update LCM status error:', error);
      return NextResponse.json(
        { error: 'Failed to update LCM status' },
        { status: 500 }
      );
    }
  });
}
