import { NextRequest, NextResponse } from 'next/server';
import { LCMService, LCMPushNotification } from '@/lib/lcmService';

export const dynamic = 'force-dynamic';

// POST /api/test-lcm - Test LCM push notifications
export async function POST(request: NextRequest) {
  try {
    const { userId, title, body, testMode } = await request.json();

    if (!title || !body) {
      return NextResponse.json(
        { error: 'title and body are required' },
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

    if (testMode === 'direct') {
      // Test Firebase FCM directly without database lookup
      console.log('Testing Firebase FCM directly...');
      
      // Use a mock token for testing
      const mockTokens = ['test-token-123'];
      
      // Call the private method directly for testing
      const LCMServiceClass = LCMService as any;
      const res = await LCMServiceClass.sendToMultipleTokens(mockTokens, notification, { testMode: true });
      console.log('FCM Response 1:', res);
      return NextResponse.json({
        success: true,
        message: 'Firebase FCM test completed (check server logs)',
        notification,
        testMode: 'direct'
      });
    } else if (userId) {
      // Original behavior - send to specific user
      const res = await LCMService.sendToUser(userId, notification);
      console.log(':FCM Response 2', res);
      console.log(':FCM Response type:', typeof res);
      console.log(':FCM Response keys:', res ? Object.keys(res) : 'null');
      
      return NextResponse.json({
        success: true,
        message: `Test notification sent to user ${userId}`,
        notification
      });
    } else {
      return NextResponse.json(
        { error: 'Either userId or testMode=direct is required' },
        { status: 400 }
      );
    }
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
