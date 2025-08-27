import { NextRequest, NextResponse } from 'next/server';
import { pusherServer } from '@/lib/realtime';

export async function POST(request: NextRequest) {
  try {
    const { userId, firstName, lastName, email } = await request.json();
    if (!userId || !firstName || !lastName || !email) {
      return NextResponse.json(
        { error: 'userId, firstName, lastName, and email are required' },
        { status: 400 }
      );
    }

    await pusherServer.trigger('global', 'user-created', { userId, firstName, lastName, email, timestamp: new Date() });

    return NextResponse.json({ success: true, message: 'user-created event emitted' });
  } catch (error) {
    console.error('user-created error:', error);
    return NextResponse.json(
      { error: 'Failed to emit user-created' },
      { status: 500 }
    );
  }
}


