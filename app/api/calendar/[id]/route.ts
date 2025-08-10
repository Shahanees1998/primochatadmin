import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import prismadb from '@/configs/prismadb';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const userId = authenticatedReq.user?.userId;
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const eventId = params.id;

      // Get user's calendar to verify access and locate event type
      const userCalendar = await prismadb.userCalendar.findUnique({
        where: { userId },
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
      });

      if (!userCalendar) {
        return NextResponse.json({ error: 'Calendar not found' }, { status: 404 });
      }

      const isTrestle = userCalendar.trestleBoardIds.includes(eventId);
      const isCustom = userCalendar.customEventIds.includes(eventId);

      if (!isTrestle && !isCustom) {
        return NextResponse.json({ error: 'Event not found in your calendar' }, { status: 404 });
      }

      if (isTrestle) {
        const trestleBoard = await prismadb.trestleBoard.findUnique({ where: { id: eventId } });
        if (!trestleBoard) {
          return NextResponse.json({ error: 'Trestle board not found' }, { status: 404 });
        }

        const response = {
          id: trestleBoard.id,
          title: trestleBoard.title,
          description: trestleBoard.description,
          date: trestleBoard.date.toISOString(),
          time: trestleBoard.time,
          location: trestleBoard.location,
          eventType: 'TRESTLE_BOARD' as const,
          trestleBoardId: trestleBoard.id,
          user: {
            id: userCalendar.user.id,
            name: `${userCalendar.user.firstName} ${userCalendar.user.lastName}`,
            email: userCalendar.user.email,
            membershipNumber: userCalendar.user.membershipNumber,
          },
          createdAt: userCalendar.createdAt.toISOString(),
          updatedAt: userCalendar.updatedAt.toISOString(),
          trestleBoard,
          customEvent: null,
        };

        return NextResponse.json(response);
      }

      // isCustom
      const customEvent = await prismadb.customEvent.findUnique({ where: { id: eventId } });
      if (!customEvent) {
        return NextResponse.json({ error: 'Custom event not found' }, { status: 404 });
      }

      const response = {
        id: customEvent.id,
        title: customEvent.title,
        description: null as string | null,
        date: customEvent.date.toISOString(),
        time: customEvent.time,
        location: null as string | null,
        eventType: 'CUSTOM' as const,
        customEventId: customEvent.id,
        user: {
          id: userCalendar.user.id,
          name: `${userCalendar.user.firstName} ${userCalendar.user.lastName}`,
          email: userCalendar.user.email,
          membershipNumber: userCalendar.user.membershipNumber,
        },
        createdAt: customEvent.createdAt.toISOString(),
        updatedAt: customEvent.updatedAt.toISOString(),
        trestleBoard: null,
        customEvent,
      };

      return NextResponse.json(response);
    } catch (error) {
      console.error('Error fetching calendar event:', error);
      return NextResponse.json(
        { error: 'Failed to fetch calendar event' },
        { status: 500 }
      );
    }
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

      // Check if event exists and belongs to user
      const existingEvent = await prismadb.customEvent.findFirst({
        where: {
          id: params.id,
          userId: authenticatedReq.user.userId,
        },
      });

      if (!existingEvent) {
        return NextResponse.json(
          { error: 'Event not found' },
          { status: 404 }
        );
      }

      const event = await prismadb.customEvent.update({
        where: { id: params.id },
        data: {
          title,
          date: new Date(date),
          time,
        },
      });

      return NextResponse.json(event);
    } catch (error) {
      console.error('Error updating calendar event:', error);
      return NextResponse.json(
        { error: 'Failed to update calendar event' },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      if (!authenticatedReq.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Check if event exists and belongs to user
      const existingEvent = await prismadb.customEvent.findFirst({
        where: {
          id: params.id,
          userId: authenticatedReq.user.userId,
        },
      });

      if (!existingEvent) {
        return NextResponse.json(
          { error: 'Event not found' },
          { status: 404 }
        );
      }

      await prismadb.customEvent.delete({
        where: { id: params.id },
      });

      return NextResponse.json({ message: 'Event deleted successfully' });
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      return NextResponse.json(
        { error: 'Failed to delete calendar event' },
        { status: 500 }
      );
    }
  });
} 