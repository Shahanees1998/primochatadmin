import { NextRequest, NextResponse } from 'next/server';
import { pusherServer } from '@/lib/realtime';

export async function POST(request: NextRequest) {
  try {
    const { chatRoomId, messageId, userId } = await request.json();
    if (!chatRoomId || !messageId || !userId) {
      return NextResponse.json(
        { error: 'chatRoomId, messageId and userId are required' },
        { status: 400 }
      );
    }

    await pusherServer.trigger(`chat-${chatRoomId}`, 'message-read', { chatRoomId, messageId, userId, timestamp: new Date() });

    return NextResponse.json({ success: true, message: 'mark-read event emitted' });
  } catch (error) {
    console.error('mark-read error:', error);
    return NextResponse.json(
      { error: 'Failed to emit mark-read event' },
      { status: 500 }
    );
  }
}


