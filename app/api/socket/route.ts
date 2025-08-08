import { NextRequest, NextResponse } from 'next/server';
import { initSocket } from '@/lib/socket';

export async function GET(req: NextRequest) {
  try {
    // Initialize socket if not already initialized
    const io = initSocket(req.socket.server);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Socket server initialized' 
    });
  } catch (error) {
    console.error('Socket initialization error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to initialize socket' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { event, data, room } = await req.json();
    const io = initSocket(req.socket.server);
    
    if (room) {
      io.to(room).emit(event, data);
    } else {
      io.emit(event, data);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Socket emit error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to emit socket event' },
      { status: 500 }
    );
  }
} 