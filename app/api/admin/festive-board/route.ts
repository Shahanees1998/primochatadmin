import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/admin/festive-board - List all festive boards
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const skip = (page - 1) * limit;
    const where: any = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [festiveBoards, total] = await Promise.all([
      prisma.festiveBoard.findMany({
        where,
        include: {
          event: true,
          items: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true, email: true },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { date: 'desc' },
      }),
      prisma.festiveBoard.count({ where }),
    ]);
    return NextResponse.json({
      festiveBoards,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get festive boards error:', error);
    return NextResponse.json({ error: 'Failed to fetch festive boards' }, { status: 500 });
  }
}

// POST /api/admin/festive-board - Create festive board
export async function POST(request: NextRequest) {
  try {
    const { eventId, title, description, date, location, maxParticipants } = await request.json();
    if (!eventId || !title || !date) {
      return NextResponse.json({ error: 'Event, title, and date are required' }, { status: 400 });
    }
    const festiveBoard = await prisma.festiveBoard.create({
      data: {
        eventId,
        title,
        description,
        date: new Date(date),
        location,
        maxParticipants: maxParticipants ? parseInt(maxParticipants) : null,
      },
      include: {
        event: true,
        items: true,
      },
    });
    return NextResponse.json(festiveBoard, { status: 201 });
  } catch (error) {
    console.error('Create festive board error:', error);
    return NextResponse.json({ error: 'Failed to create festive board' }, { status: 500 });
  }
} 