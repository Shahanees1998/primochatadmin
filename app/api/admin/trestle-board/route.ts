import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/admin/events - Get all events (admin only)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const sortField = searchParams.get('sortField');
    const sortOrder = searchParams.get('sortOrder');

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = category;
    }



    // Build orderBy clause
    let orderBy: any = { startDate: 'desc' };
    if (sortField) {
      orderBy = {};
      // sortOrder: 1 = asc, -1 = desc
      orderBy[sortField] = sortOrder === '1' ? 'asc' : 'desc';
    }

    // Get events with pagination
    const [trestleBoards, total] = await Promise.all([
      prisma.trestleBoard.findMany({
        where,
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
          _count: {
            select: {
              members: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy,
      }),
      prisma.trestleBoard.count({ where }),
    ]);
    return NextResponse.json({
      trestleBoards,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get events error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

// POST /api/admin/events - Create new event (admin only)
export async function POST(request: NextRequest) {
  try {
    const {
      title,
      description,
      startDate,
      endDate,
      startTime,
      endTime,
      location,
      category,
      isRSVP,
      maxAttendees,
    } = await request.json();

    if (!title || !startDate || !category) {
      return NextResponse.json(
        { error: 'Title, start date, and category are required' },
        { status: 400 }
      );
    }

    // Create event
    const event = await prisma.trestleBoard.create({
      data: {
        title,
        description,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        startTime,
        endTime,
        location,
        category,
        isRSVP: isRSVP || false,
        maxAttendees: maxAttendees ? parseInt(maxAttendees) : null,
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error('Create event error:', error);
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    );
  }
} 