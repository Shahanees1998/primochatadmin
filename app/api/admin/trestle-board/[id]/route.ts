import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { LCMService } from '@/lib/lcmService';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';

// GET /api/admin/events/[id] - Get specific event (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const event = await prisma.trestleBoard.findUnique({
      where: { id: params.id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
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

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(event);
  } catch (error) {
    console.error('Get event error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/events/[id] - Update event (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
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

    // Check if event exists
    const existingEvent = await prisma.trestleBoard.findUnique({
      where: { id: params.id },
    });

    if (!existingEvent) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (date) updateData.date = new Date(date);
    if (time !== undefined) updateData.time = time;
    if (location !== undefined) updateData.location = location;
    if (category) updateData.category = category;
    if (isRSVP !== undefined) updateData.isRSVP = isRSVP;
    if (maxAttendees !== undefined) updateData.maxAttendees = maxAttendees ? parseInt(maxAttendees) : null;

    // Update event
    const updatedEvent = await prisma.trestleBoard.update({
      where: { id: params.id },
      data: {
        title,
        description,
        date: new Date(date),
        time,
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
                phone: true,
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

    // Send FCM notification for trestle board update
    try {
      // Get all users who have this trestle board in their calendar or are members
      const usersWithCalendar = await prisma.userCalendar.findMany({
        where: {
          trestleBoardIds: {
            has: params.id
          },
          isDeleted: false
        },
        select: {
          userId: true,
          user: {
            select: {
              id: true,
              lcmEnabled: true,
            },
          },
        },
      });

      const memberUserIds = updatedEvent.members.map(member => member.user.id);
      const calendarUserIds = usersWithCalendar
        .filter(uc => uc.user.lcmEnabled)
        .map(uc => uc.userId);

      // Combine member IDs and calendar user IDs, remove duplicates
      const allAffectedUserIds = Array.from(new Set([...memberUserIds, ...calendarUserIds]));

      if (allAffectedUserIds.length > 0) {
        await LCMService.sendToUsers(allAffectedUserIds, {
          title: 'Trestle Board Updated',
          body: `The trestle board "${updatedEvent.title}" has been updated by admin`,
          data: {
            type: 'trestle_board_update',
            trestleBoardId: updatedEvent.id,
            action: 'updated',
            title: updatedEvent.title,
            description: updatedEvent.description,
            date: updatedEvent.date.toISOString(),
            time: updatedEvent.time,
            location: updatedEvent.location,
            category: updatedEvent.category,
            updatedBy: authenticatedReq.user?.firstName + ' ' + authenticatedReq.user?.lastName,
            updatedByUserId: authenticatedReq.user?.userId,
          },
          priority: 'high',
        });
      }
    } catch (fcmError) {
      console.error('FCM notification for trestle board update failed:', fcmError);
      // Don't fail the request if FCM fails
    }

    return NextResponse.json(updatedEvent);
  } catch (error) {
    console.error('Update event error:', error);
    const err = error as any;
    if (err && typeof err === 'object' && 'code' in err && err.code === 'P2025') {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update event' },
      { status: 500 }
    );
  }
  });
}

// DELETE /api/admin/events/[id] - Delete event (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      // Check if event exists and get details for notification
      const existingEvent = await prisma.trestleBoard.findUnique({
        where: { id: params.id },
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
        },
      });

      if (!existingEvent) {
        return NextResponse.json(
          { error: 'Event not found' },
          { status: 404 }
        );
      }

      // Send FCM notification for trestle board deletion
      try {
        await LCMService.sendToAllUsers({
          title: 'Trestle Board Deleted',
          body: `The trestle board "${existingEvent.title}" has been deleted by admin`,
          data: {
            type: 'trestle_board_update',
            trestleBoardId: existingEvent.id,
            action: 'deleted',
            title: existingEvent.title,
            description: existingEvent.description,
            date: existingEvent.date.toISOString(),
            time: existingEvent.time,
            location: existingEvent.location,
            category: existingEvent.category,
            deletedBy: authenticatedReq.user?.firstName + ' ' + authenticatedReq.user?.lastName,
            deletedByUserId: authenticatedReq.user?.userId,
          },
          priority: 'high',
        });
      } catch (fcmError) {
        console.error('FCM notification for trestle board deletion failed:', fcmError);
        // Don't fail the request if FCM fails
      }

      // Delete event (this will cascade delete related records)
      await prisma.trestleBoard.delete({
        where: { id: params.id },
      });

      return NextResponse.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    const err = error as any;
    if (err && typeof err === 'object' && 'code' in err && err.code === 'P2025') {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    );
  }
  });
} 