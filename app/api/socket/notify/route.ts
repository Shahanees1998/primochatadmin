import { NextRequest, NextResponse } from 'next/server';
import { pusherServer } from '@/lib/realtime';

export async function POST(request: NextRequest) {
  try {
    const { userId, notification, room } = await request.json();

    if (userId) {
      await pusherServer.trigger(`user-${userId}`, 'new-notification', notification);
      return NextResponse.json({ success: true, message: 'Notification sent to user' });
    }

    if (room) {
      await pusherServer.trigger(room, 'new-notification', notification);
      return NextResponse.json({ success: true, message: 'Notification sent to room' });
    }

    await pusherServer.trigger('global', 'new-notification', notification);
    return NextResponse.json({ success: true, message: 'Notification broadcasted' });
  } catch (error) {
    console.error('notify error:', error);
    return NextResponse.json(
      { error: 'Failed to emit notification' },
      { status: 500 }
    );
  }
}


