import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';
import { fcmService } from '@/lib/fcmService';

// GET /api/admin/events - Get all events (admin only)
export async function GET(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      // Check if user is admin
      // if (authenticatedReq.user?.role !== 'ADMIN') {
      //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      // }

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
      let orderBy: any = { date: 'desc' };
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
  });
}

// POST /api/admin/events - Create new event (admin only)
export async function POST(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      // Check if user is admin
      // if (authenticatedReq.user?.role !== 'ADMIN') {
      //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      // }

      const {
        title,
        description,
        date,
        time,
        location,
        category,
        isRSVP,
        maxAttendees,
      } = await request.json();

      if (!title || !date || !category) {
        return NextResponse.json(
          { error: 'Title, date, and category are required' },
          { status: 400 }
        );
      }

      // Create event
      const event = await prisma.trestleBoard.create({
        data: {
          title,
          description,
          date: new Date(date),
          time,
          location,
          category,
          isRSVP: isRSVP || false,
          maxAttendees: maxAttendees ? parseInt(maxAttendees) : null,
          createdById: authenticatedReq?.user?.userId ?? '',
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

      // Send FCM notification for new trestle board
      try {
        await fcmService.sendTrestleBoardNotification(
          event.id,
          'created',
          event.title
        );
      } catch (fcmError) {
        console.error('FCM notification failed:', fcmError);
        // Don't fail the request if FCM fails
      }

      return NextResponse.json(event, { status: 201 });
    } catch (error) {
      console.error('Create event error:', error);
      return NextResponse.json(
        { error: 'Failed to create event' },
        { status: 500 }
      );
    }
  });
} 