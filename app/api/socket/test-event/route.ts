import { NextRequest, NextResponse } from 'next/server';
import { getIO } from '@/lib/socket';

export async function POST(request: NextRequest) {
  try {
    const { room, data } = await request.json();
    const io = getIO();

    if (room) {
      io.to(room).emit('test-event', { message: 'Test event from REST', data, timestamp: new Date() });
    } else {
      io.emit('test-event', { message: 'Test event from REST', data, timestamp: new Date() });
    }

    return NextResponse.json({ success: true, message: 'test-event emitted' });
  } catch (error) {
    console.error('test-event error:', error);
    return NextResponse.json(
      { error: 'Failed to emit test-event' },
      { status: 500 }
    );
  }
}


