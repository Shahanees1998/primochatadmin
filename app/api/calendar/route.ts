import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const body = await request.json();
      const {
        title,
        description,
        startDate,
        endDate,
        startTime,
        endTime,
        location,
        eventType,
        trestleBoardId,
      } = body;

      // Get user ID from token
      const userId = authenticatedReq.user?.userId;
      
      if (!userId) {
        return NextResponse.json(
          { error: 'User not authenticated' },
          { status: 401 }
        );
      }

      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Get or create user calendar
      let userCalendar = await prisma.userCalendar.findUnique({
        where: { userId },
      });

      if (!userCalendar) {
        userCalendar = await prisma.userCalendar.create({
          data: {
            userId,
            trestleBoardIds: [],
            customEventIds: [],
          },
        });
      }

      // Handle trestle board addition
      if (trestleBoardId) {
        // Verify trestle board exists
        const trestleBoard = await prisma.trestleBoard.findUnique({
          where: { id: trestleBoardId },
        });

        if (!trestleBoard) {
          return NextResponse.json(
            { error: 'Trestle board not found' },
            { status: 404 }
          );
        }

        // Check if trestle board is already in user's calendar
        if (userCalendar.trestleBoardIds.includes(trestleBoardId)) {
          return NextResponse.json(
            { error: 'This trestle board is already added to your calendar' },
            { status: 409 }
          );
        }

        // Add trestle board to user's calendar
        const updatedUserCalendar = await prisma.userCalendar.update({
          where: { userId },
          data: {
            trestleBoardIds: {
              push: trestleBoardId
            }
          },
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

        return NextResponse.json({
          id: updatedUserCalendar.id,
          title: trestleBoard.title,
          description: trestleBoard.description,
          startDate: trestleBoard.date.toISOString(),
          endDate: null,
          startTime: trestleBoard.time,
          endTime: null,
          location: trestleBoard.location,
          eventType: 'TRESTLE_BOARD',
          user: {
            id: updatedUserCalendar.user.id,
            name: `${updatedUserCalendar.user.firstName} ${updatedUserCalendar.user.lastName}`,
            email: updatedUserCalendar.user.email,
            membershipNumber: updatedUserCalendar.user.membershipNumber,
          },
          createdAt: updatedUserCalendar.createdAt.toISOString(),
          updatedAt: updatedUserCalendar.updatedAt.toISOString(),
        }, { status: 201 });
      }

      // Handle custom event creation
      if (!title || !startDate) {
        return NextResponse.json(
          { error: 'Title and start date are required for custom events' },
          { status: 400 }
        );
      }

      // Create custom event
      const customEvent = await prisma.customEvent.create({
        data: {
          title,
          userId,
          date: new Date(startDate),
          time: startTime,
        },
      });

      // Add custom event to user's calendar
      const updatedUserCalendar = await prisma.userCalendar.update({
        where: { userId },
        data: {
          customEventIds: {
            push: customEvent.id
          }
        },
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

      return NextResponse.json({
        id: customEvent.id,
        title: customEvent.title,
        description: null,
        startDate: customEvent.date.toISOString(),
        endDate: null,
        startTime: customEvent.time,
        endTime: null,
        location: null,
        eventType: 'CUSTOM',
        user: {
          id: updatedUserCalendar.user.id,
          name: `${updatedUserCalendar.user.firstName} ${updatedUserCalendar.user.lastName}`,
          email: updatedUserCalendar.user.email,
          membershipNumber: updatedUserCalendar.user.membershipNumber,
        },
        createdAt: customEvent.createdAt.toISOString(),
        updatedAt: customEvent.updatedAt.toISOString(),
      }, { status: 201 });
    } catch (error) {
      console.error('Error creating calendar event:', error);
      return NextResponse.json(
        { error: 'Failed to create calendar event' },
        { status: 500 }
      );
    }
  });
}

export async function GET(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const userId = authenticatedReq.user?.userId;
      
      if (!userId) {
        return NextResponse.json(
          { error: 'User not authenticated' },
          { status: 401 }
        );
      }

      const { searchParams } = new URL(request.url);
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');
      const eventType = searchParams.get('eventType');

      // Get user calendar
      const userCalendar = await prisma.userCalendar.findUnique({
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
        return NextResponse.json({
          events: [],
          pagination: {
            page: 1,
            limit: 50,
            total: 0,
            pages: 0,
          },
        });
      }

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
            eventType: 'TRESTLE_BOARD' as const,
            trestleBoardId,
            user: {
              id: userCalendar.user.id,
              name: `${userCalendar.user.firstName} ${userCalendar.user.lastName}`,
              email: userCalendar.user.email,
              membershipNumber: userCalendar.user.membershipNumber,
            },
            createdAt: userCalendar.createdAt.toISOString(),
            updatedAt: userCalendar.updatedAt.toISOString(),
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
            eventType: 'CUSTOM' as const,
            customEventId,
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

      // Combine and filter events
      let allEvents = [
        ...trestleBoardEvents.filter(Boolean),
        ...customEvents.filter(Boolean),
      ];

      // Filter by date range if provided
      if (startDate) {
        allEvents = allEvents.filter(event => 
          new Date(event.date) >= new Date(startDate)
        );
      }

      if (endDate) {
        allEvents = allEvents.filter(event => 
          new Date(event.date) <= new Date(endDate)
        );
      }

      // Filter by event type if provided
      if (eventType) {
        allEvents = allEvents.filter(event => event.eventType === eventType);
      }

      // Sort by date
      allEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      return NextResponse.json({
        events: allEvents,
        pagination: {
          page: 1,
          limit: allEvents.length,
          total: allEvents.length,
          pages: 1,
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