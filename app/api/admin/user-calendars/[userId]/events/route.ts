import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

// GET /api/admin/user-calendars/[userId]/events - Get all events for a user's calendar (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      // Check if user is admin
      // if (authenticatedReq.user?.role !== 'ADMIN') {
      //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      // }

      const { userId } = params;

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          membershipNumber: true,
        },
      });

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Get user's calendar
      const userCalendar = await prisma.userCalendar.findUnique({
        where: { userId },
      });

      if (!userCalendar) {
        return NextResponse.json({
          events: [],
          user,
        });
      }

      // Get trestle boards
      const trestleBoards = await prisma.trestleBoard.findMany({
        where: {
          id: {
            in: userCalendar.trestleBoardIds
          }
        }
      });

      // Get custom events
      const customEvents = await prisma.customEvent.findMany({
        where: {
          id: {
            in: userCalendar.customEventIds
          }
        }
      });

      // Transform trestle boards to events
      const trestleBoardEvents = trestleBoards.map(tb => ({
        id: tb.id,
        title: tb.title,
        description: tb.description,
        date: tb.date.toISOString(),
        time: tb.time,
        location: tb.location,
        eventType: 'TRESTLE_BOARD' as const,
        trestleBoardId: tb.id,
        customEventId: undefined,
        user: {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          membershipNumber: user.membershipNumber,
        },
        createdAt: tb.createdAt.toISOString(),
        updatedAt: tb.updatedAt.toISOString(),
      }));

      // Transform custom events to events
      const customEventEvents = customEvents.map(ce => ({
        id: ce.id,
        title: ce.title,
        description: null,
        date: ce.date.toISOString(),
        time: ce.time,
        location: null,
        eventType: 'CUSTOM' as const,
        trestleBoardId: undefined,
        customEventId: ce.id,
        user: {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          membershipNumber: user.membershipNumber,
        },
        createdAt: ce.createdAt.toISOString(),
        updatedAt: ce.updatedAt.toISOString(),
      }));

      // Combine and sort all events by date
      const allEvents = [...trestleBoardEvents, ...customEventEvents].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      return NextResponse.json({
        events: allEvents,
        user,
      });
    } catch (error) {
      console.error('Get user calendar events error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch user calendar events' },
        { status: 500 }
      );
    }
  });
} 