import { NextRequest, NextResponse } from 'next/server';
import { getIO } from '@/lib/socket';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const io = getIO();

    io.to(userId).emit('user-joined', { userId, timestamp: new Date() });

    return NextResponse.json({ success: true, message: 'User join event emitted' });
  } catch (error) {
    console.error('join-user error:', error);
    return NextResponse.json(
      { error: 'Failed to emit join-user event' },
      { status: 500 }
    );
  }
}


