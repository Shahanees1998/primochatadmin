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
      const trestleBoardId = searchParams.get('trestleBoardId');
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '50');
      const skip = (page - 1) * limit;

      // If trestleBoardId is provided, find all users who have this trestle board in their calendar
      if (trestleBoardId) {
        const userCalendars = await prisma.userCalendar.findMany({
          where: {
            trestleBoardIds: {
              has: trestleBoardId
            },
            isDeleted: false
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
          skip,
          take: limit,
        });

        // Get the trestle board details
        const trestleBoard = await prisma.trestleBoard.findUnique({
          where: { id: trestleBoardId },
        });

        if (!trestleBoard) {
          return NextResponse.json(
            { error: 'Trestle board not found' },
            { status: 404 }
          );
        }

        // Transform the data to match frontend expectations
                 const transformedEvents = userCalendars.map(userCalendar => ({
           id: userCalendar.id,
           title: trestleBoard.title,
           description: trestleBoard.description,
           date: trestleBoard.date.toISOString(),
           eventType: 'TRESTLE_BOARD',
           location: trestleBoard.location,
          user: {
            id: userCalendar.user.id,
            name: `${userCalendar.user.firstName} ${userCalendar.user.lastName}`,
            email: userCalendar.user.email,
            membershipNumber: userCalendar.user.membershipNumber,
          },
          createdAt: userCalendar.createdAt.toISOString(),
          updatedAt: userCalendar.updatedAt.toISOString(),
        }));

        return NextResponse.json({
          events: transformedEvents,
          pagination: {
            page,
            limit,
            total: userCalendars.length,
            pages: Math.ceil(userCalendars.length / limit),
          },
        });
      }

      // If userId is provided, get all events for that user
      if (userId) {
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
              page,
              limit,
              total: 0,
              pages: 0,
            },
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

        // Combine and transform events
        const allEvents = [
                     ...trestleBoards.map(tb => ({
             id: tb.id,
             title: tb.title,
             description: tb.description,
             date: tb.date.toISOString(),
             eventType: 'TRESTLE_BOARD',
             location: tb.location,
            user: {
              id: userCalendar.user.id,
              name: `${userCalendar.user.firstName} ${userCalendar.user.lastName}`,
              email: userCalendar.user.email,
              membershipNumber: userCalendar.user.membershipNumber,
            },
            createdAt: userCalendar.createdAt.toISOString(),
            updatedAt: userCalendar.updatedAt.toISOString(),
          })),
          ...customEvents.map(ce => ({
            id: ce.id,
            title: ce.title,
            description: null,
            date: ce.date.toISOString(),
            eventType: 'CUSTOM',
            location: null,
            user: {
              id: userCalendar.user.id,
              name: `${userCalendar.user.firstName} ${userCalendar.user.lastName}`,
              email: userCalendar.user.email,
              membershipNumber: userCalendar.user.membershipNumber,
            },
            createdAt: ce.createdAt.toISOString(),
            updatedAt: ce.updatedAt.toISOString(),
          }))
        ];

        return NextResponse.json({
          events: allEvents,
          pagination: {
            page,
            limit,
            total: allEvents.length,
            pages: Math.ceil(allEvents.length / limit),
          },
        });
      }

      // Default: get all user calendars
      const userCalendars = await prisma.userCalendar.findMany({
        where: {
          isDeleted: false
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
        skip,
        take: limit,
      });

      return NextResponse.json({
        events: [],
        pagination: {
          page,
          limit,
          total: 0,
          pages: 0,
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

export async function POST(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      // Check if user is admin
      if (authenticatedReq.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const body = await request.json();
      const {
        userId,
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

      if (!userId) {
        return NextResponse.json(
          { error: 'User ID is required' },
          { status: 400 }
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
            { error: 'This trestle board is already added to this user\'s calendar' },
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

export async function DELETE(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      // Check if user is admin
      if (authenticatedReq.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { searchParams } = new URL(request.url);
      const eventId = searchParams.get('eventId');
      const eventType = searchParams.get('eventType'); // 'TRESTLE_BOARD' or 'CUSTOM'
      const userId = searchParams.get('userId');

      if (!eventId || !eventType || !userId) {
        return NextResponse.json(
          { error: 'Event ID, event type, and user ID are required' },
          { status: 400 }
        );
      }

      const userCalendar = await prisma.userCalendar.findUnique({
        where: { userId },
      });

      if (!userCalendar) {
        return NextResponse.json(
          { error: 'User calendar not found' },
          { status: 404 }
        );
      }

      if (eventType === 'TRESTLE_BOARD') {
        // Remove trestle board from user's calendar
        const updatedTrestleBoardIds = userCalendar.trestleBoardIds.filter(id => id !== eventId);
        
        await prisma.userCalendar.update({
          where: { userId },
          data: {
            trestleBoardIds: updatedTrestleBoardIds
          }
        });
      } else if (eventType === 'CUSTOM') {
        // Delete custom event and remove from user's calendar
        await prisma.customEvent.delete({
          where: { id: eventId },
        });

        const updatedCustomEventIds = userCalendar.customEventIds.filter(id => id !== eventId);
        
        await prisma.userCalendar.update({
          where: { userId },
          data: {
            customEventIds: updatedCustomEventIds
          }
        });
      }

      return NextResponse.json({ message: 'Calendar event deleted successfully' }, { status: 200 });
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      return NextResponse.json(
        { error: 'Failed to delete calendar event' },
        { status: 500 }
      );
    }
  });
} 