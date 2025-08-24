import { NextRequest, NextResponse } from 'next/server';
import { getIO } from '@/lib/socket';

export async function POST(request: NextRequest) {
  try {
    const { id, title, description, date } = await request.json();
    if (!id || !title) {
      return NextResponse.json(
        { error: 'id and title are required' },
        { status: 400 }
      );
    }

    const io = getIO();
    io.emit('trestle-board-added', { id, title, description, date, timestamp: new Date() });

    return NextResponse.json({ success: true, message: 'trestle-board-added event emitted' });
  } catch (error) {
    console.error('trestle-board-added error:', error);
    return NextResponse.json(
      { error: 'Failed to emit trestle-board-added' },
      { status: 500 }
    );
  }
}


