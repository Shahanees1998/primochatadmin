import { NextRequest, NextResponse } from 'next/server';
// With Pusher, clients subscribe to `user-{userId}` directly; this endpoint is a no-op

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: 'Pusher: clients subscribe directly' });
  } catch (error) {
    console.error('join-user error:', error);
    return NextResponse.json(
      { error: 'Failed to emit join-user event' },
      { status: 500 }
    );
  }
}


