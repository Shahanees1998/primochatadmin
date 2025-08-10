import { NextRequest, NextResponse } from 'next/server';
import { getIO } from '@/lib/socket';

export async function GET(req: NextRequest) {
  try {
    const io = getIO();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Socket server is running',
      connectedClients: io.engine.clientsCount || 0
    });
  } catch (error) {
    console.error('Socket status error:', error);
    return NextResponse.json(
      { success: false, error: 'Socket server not available' },
      { status: 503 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { event, data, room, userId } = await req.json();
    const io = getIO();
    
    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event name is required' },
        { status: 400 }
      );
    }

    // Handle different event types
    if (event === 'join-user' && userId) {
      // Join user to their personal room
      io.to(userId).emit('user-joined', { userId, timestamp: new Date() });
      return NextResponse.json({ success: true, message: 'User joined room' });
    }
    
    if (event === 'join-chat' && room) {
      // Join chat room
      io.to(`chat-${room}`).emit('user-joined-chat', { room, timestamp: new Date() });
      return NextResponse.json({ success: true, message: 'Joined chat room' });
    }
    
    if (event === 'leave-chat' && room) {
      // Leave chat room
      io.to(`chat-${room}`).emit('user-left-chat', { room, timestamp: new Date() });
      return NextResponse.json({ success: true, message: 'Left chat room' });
    }
    
    if (event === 'test-event') {
      // Test event
      if (room) {
        io.to(room).emit('test-event', { message: 'Test event from API', data, timestamp: new Date() });
      } else {
        io.emit('test-event', { message: 'Test event from API', data, timestamp: new Date() });
      }
      return NextResponse.json({ success: true, message: 'Test event sent' });
    }
    
    // Generic event emission
    if (room) {
      io.to(room).emit(event, { ...data, timestamp: new Date() });
    } else {
      io.emit(event, { ...data, timestamp: new Date() });
    }
    
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