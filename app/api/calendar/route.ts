import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      if (!authenticatedReq.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { searchParams } = new URL(request.url);
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');
      const eventType = searchParams.get('eventType');

      const where: any = {
        userId: authenticatedReq.user.userId,
      };

      if (startDate && endDate) {
        where.date = {
          gte: new Date(startDate),
          lte: new Date(endDate),
        };
      }

      const events = await prisma.customEvent.findMany({
        where,
        orderBy: { date: 'asc' },
      });

      return NextResponse.json(events);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      return NextResponse.json(
        { error: 'Failed to fetch calendar events' },
        { status: 500 }
      );
    }
  });
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      if (!authenticatedReq.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const body = await request.json();
      const { title, date, time } = body;

      if (!title || !date) {
        return NextResponse.json(
          { error: 'Title and date are required' },
          { status: 400 }
        );
      }

      const event = await prisma.customEvent.create({
        data: {
          title,
          date: new Date(date),
          time,
          userId: authenticatedReq.user.userId,
        },
      });

      return NextResponse.json(event, { status: 201 });
    } catch (error) {
      console.error('Error creating calendar event:', error);
      return NextResponse.json(
        { error: 'Failed to create calendar event' },
        { status: 500 }
      );
    }
  });
} 