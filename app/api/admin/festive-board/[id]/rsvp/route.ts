import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';
import { NotificationService } from '@/lib/notificationService';
import { LCMService } from '@/lib/lcmService';

// GET - Get all RSVP participants for admin view
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      if (!authenticatedReq.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Check if user is admin
      if (!['ADMIN', 'ADMINLEVELTWO', 'ADMINLEVELTHREE'].includes(authenticatedReq.user.role)) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }

      // Get festive board with RSVP information
      const festiveBoard = await prisma.festiveBoard.findUnique({
        where: { id: params.id },
        include: {
          rsvpMembers: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  membershipNumber: true,
                  profileImage: true,
                  phone: true,
                },
              },
              signedUpByUser: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
            orderBy: [
              { status: 'asc' },
              { createdAt: 'asc' },
            ],
          },
        },
      });

      if (!festiveBoard) {
        return NextResponse.json(
          { error: 'Festive board not found' },
          { status: 404 }
        );
      }

      // Count RSVPs by status
      const rsvpCounts = {
        CONFIRMED: festiveBoard.rsvpMembers.filter(r => r.status === 'CONFIRMED').length,
        PENDING: festiveBoard.rsvpMembers.filter(r => r.status === 'PENDING').length,
        DECLINED: festiveBoard.rsvpMembers.filter(r => r.status === 'DECLINED').length,
        MAYBE: festiveBoard.rsvpMembers.filter(r => r.status === 'MAYBE').length,
        TOTAL: festiveBoard.rsvpMembers.length,
      };

      // Check if max attendees is reached
      const isMaxAttendeesReached = festiveBoard.maxAttendees 
        ? rsvpCounts.CONFIRMED >= festiveBoard.maxAttendees 
        : false;

      // Group participants by status
      const participantsByStatus = {
        CONFIRMED: festiveBoard.rsvpMembers.filter(r => r.status === 'CONFIRMED'),
        PENDING: festiveBoard.rsvpMembers.filter(r => r.status === 'PENDING'),
        DECLINED: festiveBoard.rsvpMembers.filter(r => r.status === 'DECLINED'),
        MAYBE: festiveBoard.rsvpMembers.filter(r => r.status === 'MAYBE'),
      };

      return NextResponse.json({
        festiveBoard: {
          id: festiveBoard.id,
          title: festiveBoard.title,
          date: festiveBoard.date,
          isRSVP: festiveBoard.isRSVP,
          maxAttendees: festiveBoard.maxAttendees,
          description: festiveBoard.description,
        },
        rsvpCounts,
        isMaxAttendeesReached,
        participantsByStatus,
        allParticipants: festiveBoard.rsvpMembers.map(rsvp => ({
          id: rsvp.id,
          user: rsvp.user,
          status: rsvp.status,
          createdAt: rsvp.createdAt,
          updatedAt: rsvp.updatedAt,
          signedUpBy: rsvp.signedUpByUser,
        })),
      });
    } catch (error) {
      console.error('Error fetching festive board RSVP admin data:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

// POST - Admin can create/update RSVP for any user
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      if (!authenticatedReq.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Check if user is admin
      if (!['ADMIN', 'ADMINLEVELTWO', 'ADMINLEVELTHREE'].includes(authenticatedReq.user.role)) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }

      const { userId, status } = await request.json();

      if (!userId || !status || !['CONFIRMED', 'PENDING', 'DECLINED', 'MAYBE'].includes(status)) {
        return NextResponse.json(
          { error: 'Invalid userId or RSVP status' },
          { status: 400 }
        );
      }

      // Get festive board
      const festiveBoard = await prisma.festiveBoard.findUnique({
        where: { id: params.id },
        include: {
          rsvpMembers: {
            where: { status: 'CONFIRMED' },
          },
        },
      });

      if (!festiveBoard) {
        return NextResponse.json(
          { error: 'Festive board not found' },
          { status: 404 }
        );
      }

      if (!festiveBoard.isRSVP) {
        return NextResponse.json(
          { error: 'RSVP is not enabled for this festive board' },
          { status: 400 }
        );
      }

      // Check if target user exists
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          lcmEnabled: true,
        },
      });

      if (!targetUser) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Check if max attendees is reached for CONFIRMED status
      if (status === 'CONFIRMED' && festiveBoard.maxAttendees) {
        if (festiveBoard.rsvpMembers.length >= festiveBoard.maxAttendees) {
          return NextResponse.json(
            { error: 'Maximum number of attendees reached' },
            { status: 400 }
          );
        }
      }

      // Upsert RSVP (create or update)
      const rsvp = await prisma.festiveBoardRSVP.upsert({
        where: {
          festiveBoardId_userId: {
            festiveBoardId: params.id,
            userId: userId,
          },
        },
        update: {
          status,
          signedUpBy: authenticatedReq.user.userId,
          updatedAt: new Date(),
        },
        create: {
          festiveBoardId: params.id,
          userId: userId,
          status,
          signedUpBy: authenticatedReq.user.userId,
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
          signedUpByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Send notifications
      try {
        // Create in-app notification for the target user
        await NotificationService.createNotification({
          userId: userId,
          title: 'RSVP Updated',
          message: `Your RSVP for "${festiveBoard.title}" has been updated to ${status} by an admin`,
          type: 'FESTIVE_BOARD_UPDATE' as any,
          relatedId: params.id,
          relatedType: 'festive_board',
        });

        // Send push notification to target user if they have it enabled
        if (targetUser.lcmEnabled) {
          await LCMService.sendToUsers([userId], {
            title: 'RSVP Updated',
            body: `Your RSVP for "${festiveBoard.title}" has been updated to ${status}`,
            data: {
              type: 'festive_board_rsvp_update',
              action: 'admin_updated_rsvp',
              festiveBoardId: params.id,
              itemTitle: festiveBoard.title,
              rsvpStatus: status,
            },
            priority: 'high',
          });
        }
      } catch (notificationError) {
        console.error('Error sending notifications:', notificationError);
        // Don't fail the request if notification creation fails
      }

      return NextResponse.json(rsvp, { status: 201 });
    } catch (error) {
      console.error('Error updating festive board RSVP (admin):', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

// DELETE - Admin can remove RSVP for any user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      if (!authenticatedReq.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Check if user is admin
      if (!['ADMIN', 'ADMINLEVELTWO', 'ADMINLEVELTHREE'].includes(authenticatedReq.user.role)) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }

      const { searchParams } = new URL(request.url);
      const userId = searchParams.get('userId');

      if (!userId) {
        return NextResponse.json(
          { error: 'userId parameter is required' },
          { status: 400 }
        );
      }

      // Get festive board
      const festiveBoard = await prisma.festiveBoard.findUnique({
        where: { id: params.id },
      });

      if (!festiveBoard) {
        return NextResponse.json(
          { error: 'Festive board not found' },
          { status: 404 }
        );
      }

      if (!festiveBoard.isRSVP) {
        return NextResponse.json(
          { error: 'RSVP is not enabled for this festive board' },
          { status: 400 }
        );
      }

      // Delete RSVP
      await prisma.festiveBoardRSVP.deleteMany({
        where: {
          festiveBoardId: params.id,
          userId: userId,
        },
      });

      // Send notification to user
      try {
        await NotificationService.createNotification({
          userId: userId,
          title: 'RSVP Removed',
          message: `Your RSVP for "${festiveBoard.title}" has been removed by an admin`,
          type: 'FESTIVE_BOARD_UPDATE' as any,
          relatedId: params.id,
          relatedType: 'festive_board',
        });
      } catch (notificationError) {
        console.error('Error sending notification:', notificationError);
      }

      return NextResponse.json(
        { message: 'RSVP removed successfully' },
        { status: 200 }
      );
    } catch (error) {
      console.error('Error removing festive board RSVP (admin):', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
