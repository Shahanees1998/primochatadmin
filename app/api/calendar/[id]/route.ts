import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

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
      const { title, description, date, eventType, location } = body;

      if (!title || !date || !eventType) {
        return NextResponse.json(
          { error: 'Title, date, and event type are required' },
          { status: 400 }
        );
      }

      // Check if event exists and belongs to user
      const existingEvent = await prisma.calendarEvent.findFirst({
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

      const event = await prisma.calendarEvent.update({
        where: { id: params.id },
        data: {
          title,
          description,
          date: new Date(date),
          eventType,
          location,
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
      const existingEvent = await prisma.calendarEvent.findFirst({
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

      await prisma.calendarEvent.delete({
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