import { NextRequest, NextResponse } from 'next/server';
import { pusherServer } from '@/lib/realtime';

export async function GET(req: NextRequest) {
  return NextResponse.json({ success: true, message: 'Pusher is configured' });
}

export async function POST(req: NextRequest) {
  try {
    const { event, data, room, userId } = await req.json();
    
    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event name is required' },
        { status: 400 }
      );
    }

    // Handle different event types
    if (event === 'join-user' && userId) {
      return NextResponse.json({ success: true, message: 'Pusher clients subscribe directly' });
    }
    
    if (event === 'join-chat' && room) {
      return NextResponse.json({ success: true, message: 'Pusher clients subscribe directly' });
    }
    
    if (event === 'leave-chat' && room) {
      return NextResponse.json({ success: true, message: 'Pusher clients unsubscribe directly' });
    }
    
    if (event === 'test-event') {
      await pusherServer.trigger(room || 'global', 'test-event', { message: 'Test event from API', data, timestamp: new Date() });
      return NextResponse.json({ success: true, message: 'Test event sent' });
    }
    
    // Generic event emission
    await pusherServer.trigger(room || 'global', event, { ...data, timestamp: new Date() });
    
    return NextResponse.json({ 
      success: true, 
      message: `Event '${event}' emitted successfully`,
      event,
      room: room || 'global'
    });
  } catch (error) {
    console.error('Socket emit error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to emit socket event' },
      { status: 503 }
    );
  }
} 