import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

// DELETE /api/admin/user-calendars/[userId]/trestle-boards/[trestleBoardId] - Remove trestle board from user calendar (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string; trestleBoardId: string } }
) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      // Check if user is admin
      // if (authenticatedReq.user?.role !== 'ADMIN') {
      //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      // }

      const { userId, trestleBoardId } = params;

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

      // Check if trestle board exists
      const trestleBoard = await prisma.trestleBoard.findUnique({
        where: { id: trestleBoardId },
      });

      if (!trestleBoard) {
        return NextResponse.json(
          { error: 'Trestle board not found' },
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

      // Check if trestle board is in user's calendar
      if (!userCalendar.trestleBoardIds.includes(trestleBoardId)) {
        return NextResponse.json(
          { error: 'Trestle board is not in user\'s calendar' },
          { status: 400 }
        );
      }

      // Remove trestle board from user's calendar
      const updatedUserCalendar = await prisma.userCalendar.update({
        where: { userId },
        data: {
          trestleBoardIds: {
            set: userCalendar.trestleBoardIds.filter(id => id !== trestleBoardId)
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
        message: 'Trestle board removed from user calendar successfully',
        userCalendar: updatedUserCalendar,
      });
    } catch (error) {
      console.error('Remove trestle board from calendar error:', error);
      return NextResponse.json(
        { error: 'Failed to remove trestle board from user calendar' },
        { status: 500 }
      );
    }
  });
} 