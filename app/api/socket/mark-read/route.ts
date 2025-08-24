import { NextRequest, NextResponse } from 'next/server';
import { getIO } from '@/lib/socket';

export async function POST(request: NextRequest) {
  try {
    const { chatRoomId, messageId, userId } = await request.json();
    if (!chatRoomId || !messageId || !userId) {
      return NextResponse.json(
        { error: 'chatRoomId, messageId and userId are required' },
        { status: 400 }
      );
    }

    const io = getIO();
    const roomName = `chat-${chatRoomId}`;
    io.to(roomName).emit('message-read', { chatRoomId, messageId, userId, timestamp: new Date() });

    return NextResponse.json({ success: true, message: 'mark-read event emitted' });
  } catch (error) {
    console.error('mark-read error:', error);
    return NextResponse.json(
      { error: 'Failed to emit mark-read event' },
      { status: 500 }
    );
  }
}


