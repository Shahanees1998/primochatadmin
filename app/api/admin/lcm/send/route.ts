import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { LCMService, LCMPushNotification } from '@/lib/lcmService';

export const dynamic = 'force-dynamic';

// POST /api/admin/lcm/send - Send push notification (Admin only)
export async function POST(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const {
        userIds, // Array of user IDs to send to (optional)
        sendToAll, // Boolean to send to all users (optional)
        title,
        body,
        data,
        image,
        badge,
        sound,
        priority,
        ttl
      } = await request.json();

      if (!title || !body) {
        return NextResponse.json(
          { error: 'Title and body are required' },
          { status: 400 }
        );
      }

      const notification: LCMPushNotification = {
        title,
        body,
        data,
        image,
        badge,
        sound,
        priority,
        ttl
      };

      if (sendToAll) {
        // Send to all users
        await LCMService.sendToAllUsers(notification);
        return NextResponse.json({
          success: true,
          message: 'Push notification sent to all users'
        });
      } else if (userIds && Array.isArray(userIds) && userIds.length > 0) {
        // Send to specific users
        await LCMService.sendToUsers(userIds, notification);
        return NextResponse.json({
          success: true,
          message: `Push notification sent to ${userIds.length} users`
        });
      } else {
        return NextResponse.json(
          { error: 'Either sendToAll or userIds array is required' },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error('Send LCM notification error:', error);
      return NextResponse.json(
        { error: 'Failed to send push notification' },
        { status: 500 }
      );
    }
  });
}
