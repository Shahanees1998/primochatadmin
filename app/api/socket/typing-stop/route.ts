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
    io.to(roomName).emit('user-typing', { chatRoomId, userId, isTyping: false, timestamp: new Date() });

    return NextResponse.json({ success: true, message: 'typing-stop event emitted' });
  } catch (error) {
    console.error('typing-stop error:', error);
    return NextResponse.json(
      { error: 'Failed to emit typing-stop event' },
      { status: 500 }
    );
  }
}


