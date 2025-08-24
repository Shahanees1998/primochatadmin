import { NextRequest, NextResponse } from 'next/server';
import { getIO } from '@/lib/socket';

export async function POST(request: NextRequest) {
  try {
    const { chatRoomId, userId } = await request.json();
    if (!chatRoomId || !userId) {
      return NextResponse.json(
        { error: 'chatRoomId and userId are required' },
        { status: 400 }
      );
    }

    const io = getIO();
    const roomName = `chat-${chatRoomId}`;
    io.to(roomName).emit('user-typing', { chatRoomId, userId, isTyping: true, timestamp: new Date() });

    return NextResponse.json({ success: true, message: 'typing-start event emitted' });
  } catch (error) {
    console.error('typing-start error:', error);
    return NextResponse.json(
      { error: 'Failed to emit typing-start event' },
      { status: 500 }
    );
  }
}


