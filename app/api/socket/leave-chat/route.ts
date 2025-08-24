import { NextRequest, NextResponse } from 'next/server';
import { getIO } from '@/lib/socket';

export async function POST(request: NextRequest) {
  try {
    const { chatRoomId, userId } = await request.json();
    if (!chatRoomId) {
      return NextResponse.json(
        { error: 'chatRoomId is required' },
        { status: 400 }
      );
    }

    const io = getIO();
    const roomName = `chat-${chatRoomId}`;
    io.to(roomName).emit('user-left-chat', { room: chatRoomId, userId, timestamp: new Date() });

    return NextResponse.json({ success: true, message: 'leave-chat event emitted' });
  } catch (error) {
    console.error('leave-chat error:', error);
    return NextResponse.json(
      { error: 'Failed to emit leave-chat event' },
      { status: 500 }
    );
  }
}


