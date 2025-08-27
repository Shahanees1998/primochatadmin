import { NextRequest, NextResponse } from 'next/server';
import { pusherServer } from '@/lib/realtime';

export async function POST(request: NextRequest) {
  try {
    const { chatRoomId, userId } = await request.json();
    if (!chatRoomId) {
      return NextResponse.json(
        { error: 'chatRoomId is required' },
        { status: 400 }
      );
    }

    await pusherServer.trigger(`chat-${chatRoomId}`, 'user-left-chat', { room: chatRoomId, userId, timestamp: new Date() });
    return NextResponse.json({ success: true, message: 'Pusher: user-left-chat emitted' });
  } catch (error) {
    console.error('leave-chat error:', error);
    return NextResponse.json(
      { error: 'Failed to emit leave-chat event' },
      { status: 500 }
    );
  }
}


