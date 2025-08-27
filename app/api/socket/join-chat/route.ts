import { NextRequest, NextResponse } from 'next/server';
// No-op for Pusher; clients subscribe directly. Keep for backward compatibility.

export async function POST(request: NextRequest) {
  try {
    const { chatRoomId, userId } = await request.json();
    if (!chatRoomId) {
      return NextResponse.json(
        { error: 'chatRoomId is required' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: 'Pusher: clients subscribe directly to channels' });

    return NextResponse.json({ success: true, message: 'join-chat event emitted' });
  } catch (error) {
    console.error('join-chat error:', error);
    return NextResponse.json(
      { error: 'Failed to emit join-chat event' },
      { status: 500 }
    );
  }
}


