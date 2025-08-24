import { NextRequest, NextResponse } from 'next/server';
import { getIO } from '@/lib/socket';

export async function POST(request: NextRequest) {
  try {
    const { festiveBoardId, festiveBoardTitle, mealData } = await request.json();
    if (!festiveBoardId) {
      return NextResponse.json(
        { error: 'festiveBoardId is required' },
        { status: 400 }
      );
    }

    const io = getIO();
    io.emit('meal-selection', { festiveBoardId, festiveBoardTitle, mealData, timestamp: new Date() });

    return NextResponse.json({ success: true, message: 'meal-selection event emitted' });
  } catch (error) {
    console.error('meal-selection error:', error);
    return NextResponse.json(
      { error: 'Failed to emit meal-selection' },
      { status: 500 }
    );
  }
}


