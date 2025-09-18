import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

// GET /api/admin/calendar/user-events - Get all user events for admin management
export async function GET(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      // Check if user is admin level 2 or 3
      const userRole = authenticatedReq.user?.role;
      if (userRole !== 'ADMINLEVELTWO' && userRole !== 'ADMINLEVELTHREE') {
        return NextResponse.json(
          { error: 'Insufficient permissions. Admin level 2 or 3 required.' },
          { status: 403 }
        );
      }

      const { searchParams } = new URL(request.url);
      const userId = searchParams.get('userId');
      const eventType = searchParams.get('eventType');
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');

      // Build where clause for filtering
      const where: any = {};
      if (userId) {
        where.userId = userId;
      }

      // Get all user calendars with their events
      const userCalendars = await prisma.userCalendar.findMany({
        where: userId ? { userId } : {},
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

      const allEvents: any[] = [];

      // Process each user's calendar
      for (const userCalendar of userCalendars) {
        // Get trestle board events
        const trestleBoardEvents = await Promise.all(
          userCalendar.trestleBoardIds.map(async (trestleBoardId) => {
            const trestleBoard = await prisma.trestleBoard.findUnique({
              where: { id: trestleBoardId },
            });

            if (!trestleBoard) return null;

            return {
              id: trestleBoardId,
              title: trestleBoard.title,
              description: trestleBoard.description,
              date: trestleBoard.date.toISOString(),
              time: trestleBoard.time,
              location: trestleBoard.location,
              category: trestleBoard.category,
              eventType: 'TRESTLE_BOARD' as const,
              trestleBoardId: trestleBoard.id,
              user: {
                id: userCalendar.user.id,
                name: `${userCalendar.user.firstName} ${userCalendar.user.lastName}`,
                email: userCalendar.user.email,
                membershipNumber: userCalendar.user.membershipNumber,
              },
              createdAt: trestleBoard.createdAt.toISOString(),
              updatedAt: trestleBoard.updatedAt.toISOString(),
            };
          })
        );

        // Get custom events
        const customEvents = await Promise.all(
          userCalendar.customEventIds.map(async (customEventId) => {
            const customEvent = await prisma.customEvent.findUnique({
              where: { id: customEventId },
            });

            if (!customEvent) return null;

            return {
              id: customEventId,
              title: customEvent.title,
              description: null,
              date: customEvent.date.toISOString(),
              time: customEvent.time,
              location: null,
              category: null,
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
            };
          })
        );

        // Add non-null events to the list
        allEvents.push(
          ...trestleBoardEvents.filter((event): event is NonNullable<typeof event> => event !== null),
          ...customEvents.filter((event): event is NonNullable<typeof event> => event !== null)
        );
      }

      // Apply filters
      let filteredEvents = allEvents;

      if (eventType) {
        filteredEvents = filteredEvents.filter(event => event.eventType === eventType);
      }

      if (startDate) {
        filteredEvents = filteredEvents.filter(event => 
          new Date(event.date) >= new Date(startDate)
        );
      }

      if (endDate) {
        filteredEvents = filteredEvents.filter(event => 
          new Date(event.date) <= new Date(endDate)
        );
      }

      // Sort by date
      filteredEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      return NextResponse.json({
        events: filteredEvents,
        pagination: {
          page: 1,
          limit: filteredEvents.length,
          total: filteredEvents.length,
          pages: 1,
        },
      });
    } catch (error) {
      console.error('Error fetching user events:', error);
      return NextResponse.json(
        { error: 'Failed to fetch user events' },
        { status: 500 }
      );
    }
  });
}
