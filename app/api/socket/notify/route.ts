import { NextRequest, NextResponse } from 'next/server';
import { getIO } from '@/lib/socket';

export async function POST(request: NextRequest) {
  try {
    const { userId, notification, room } = await request.json();
    const io = getIO();

    if (userId) {
      io.to(userId).emit('new-notification', notification);
      return NextResponse.json({ success: true, message: 'Notification sent to user' });
    }

    if (room) {
      io.to(room).emit('new-notification', notification);
      return NextResponse.json({ success: true, message: 'Notification sent to room' });
    }

    io.emit('new-notification', notification);
    return NextResponse.json({ success: true, message: 'Notification broadcasted' });
  } catch (error) {
    console.error('notify error:', error);
    return NextResponse.json(
      { error: 'Failed to emit notification' },
      { status: 500 }
    );
  }
}


