import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/calendar - Get user's calendar events
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    const where: any = { userId };
    if (startDate && endDate) {
      where.OR = [
        { startDate: { gte: new Date(startDate), lte: new Date(endDate) } },
        { endDate: { gte: new Date(startDate), lte: new Date(endDate) } },
        { AND: [{ startDate: { lte: new Date(startDate) } }, { endDate: { gte: new Date(endDate) } }] },
      ];
    }
    const calendarEvents = await prisma.calendarEvent.findMany({
      where,
      orderBy: { startDate: 'asc' },
    });
    return NextResponse.json({ calendarEvents });
  } catch (error) {
    console.error('Get calendar events error:', error);
    return NextResponse.json({ error: 'Failed to fetch calendar events' }, { status: 500 });
  }
}

// POST /api/calendar - Create calendar event
export async function POST(request: NextRequest) {
  try {
    const { userId, title, description, startDate, endDate, location, isPersonal, eventId } = await request.json();
    if (!userId || !title || !startDate) {
      return NextResponse.json({ error: 'User ID, title, and start date are required' }, { status: 400 });
    }
    const calendarEvent = await prisma.calendarEvent.create({
      data: {
        userId,
        title,
        description,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        location,
        isPersonal: isPersonal !== undefined ? isPersonal : true,
        eventId,
      },
    });
    return NextResponse.json(calendarEvent, { status: 201 });
  } catch (error) {
    console.error('Create calendar event error:', error);
    return NextResponse.json({ error: 'Failed to create calendar event' }, { status: 500 });
  }
} 