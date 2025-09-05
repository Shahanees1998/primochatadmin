import { NextRequest, NextResponse } from 'next/server';
import { LCMService, LCMPushNotification } from '@/lib/lcmService';

export const dynamic = 'force-dynamic';

// POST /api/test-lcm - Test LCM push notifications
export async function POST(request: NextRequest) {
  try {
    const { userId, title, body } = await request.json();

    if (!userId || !title || !body) {
      return NextResponse.json(
        { error: 'userId, title, and body are required' },
        { status: 400 }
      );
    }

    const notification: LCMPushNotification = {
      title,
      body,
      data: {
        type: 'test',
        timestamp: new Date().toISOString(),
        source: 'test-endpoint'
      },
      priority: 'high',
      badge: 1
    };

    await LCMService.sendToUser(userId, notification);

    return NextResponse.json({
      success: true,
      message: `Test notification sent to user ${userId}`,
      notification
    });
  } catch (error) {
    console.error('Test LCM error:', error);
    return NextResponse.json(
      { error: 'Failed to send test notification' },
      { status: 500 }
    );
  }
}

// GET /api/test-lcm - Get user's device count
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const deviceCount = await LCMService.getUserDeviceCount(userId);

    return NextResponse.json({
      userId,
      deviceCount,
      message: `User has ${deviceCount} registered device(s)`
    });
  } catch (error) {
    console.error('Get device count error:', error);
    return NextResponse.json(
      { error: 'Failed to get device count' },
      { status: 500 }
    );
  }
}
