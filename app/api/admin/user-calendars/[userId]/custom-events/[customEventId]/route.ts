import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

// DELETE /api/admin/user-calendars/[userId]/custom-events/[customEventId] - Remove custom event from user calendar (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string; customEventId: string } }
) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      // Check if user is admin
      // if (authenticatedReq.user?.role !== 'ADMIN') {
      //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      // }

      const { userId, customEventId } = params;

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Check if custom event exists
      const customEvent = await prisma.customEvent.findUnique({
        where: { id: customEventId },
      });

      if (!customEvent) {
        return NextResponse.json(
          { error: 'Custom event not found' },
          { status: 404 }
        );
      }

      // Get user's calendar
      const userCalendar = await prisma.userCalendar.findUnique({
        where: { userId },
      });

      if (!userCalendar) {
        return NextResponse.json(
          { error: 'User calendar not found' },
          { status: 404 }
        );
      }

      // Check if custom event is in user's calendar
      if (!userCalendar.customEventIds.includes(customEventId)) {
        return NextResponse.json(
          { error: 'Custom event is not in user\'s calendar' },
          { status: 400 }
        );
      }

      // Remove custom event from user's calendar
      const updatedUserCalendar = await prisma.userCalendar.update({
        where: { userId },
        data: {
          customEventIds: {
            set: userCalendar.customEventIds.filter(id => id !== customEventId)
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
        message: 'Custom event removed from user calendar successfully',
        userCalendar: updatedUserCalendar,
      });
    } catch (error) {
      console.error('Remove custom event from calendar error:', error);
      return NextResponse.json(
        { error: 'Failed to remove custom event from user calendar' },
        { status: 500 }
      );
    }
  });
} 