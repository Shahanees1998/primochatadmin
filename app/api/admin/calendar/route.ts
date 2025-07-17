import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      // Check if user is admin
      if (authenticatedReq.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { searchParams } = new URL(request.url);
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');
      const eventType = searchParams.get('eventType');
      const userId = searchParams.get('userId');
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '50');
      const skip = (page - 1) * limit;

      const where: any = {};
      
      if (startDate && endDate) {
        where.startDate = {
          gte: new Date(startDate),
          lte: new Date(endDate),
        };
      }

      if (eventType) {
        where.eventType = eventType;
      }

      if (userId) {
        where.userId = userId;
      }

      const [events, total] = await Promise.all([
        prisma.calendarEvent.findMany({
          where,
          include: {
                      user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              membershipNumber: true,
            },
          },
          },
          orderBy: { startDate: 'asc' },
          skip,
          take: limit,
        }),
        prisma.calendarEvent.count({ where }),
      ]);

      return NextResponse.json({
        events,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      return NextResponse.json(
        { error: 'Failed to fetch calendar events' },
        { status: 500 }
      );
    }
  });
} 