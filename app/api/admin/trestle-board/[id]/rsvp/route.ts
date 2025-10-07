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

      // Get trestle board with RSVP information
      const trestleBoard = await prisma.trestleBoard.findUnique({
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

      if (!trestleBoard) {
        return NextResponse.json(
          { error: 'Trestle board not found' },
          { status: 404 }
        );
      }

      // Count RSVPs by status
      const rsvpCounts = {
        CONFIRMED: trestleBoard.members.filter(m => m.status === 'CONFIRMED').length,
        PENDING: trestleBoard.members.filter(m => m.status === 'PENDING').length,
        DECLINED: trestleBoard.members.filter(m => m.status === 'DECLINED').length,
        MAYBE: trestleBoard.members.filter(m => m.status === 'MAYBE').length,
        TOTAL: trestleBoard.members.length,
      };

      // Check if max attendees is reached
      const isMaxAttendeesReached = trestleBoard.maxAttendees 
        ? rsvpCounts.CONFIRMED >= trestleBoard.maxAttendees 
        : false;

      // Group participants by status
      const participantsByStatus = {
        CONFIRMED: trestleBoard.members.filter(m => m.status === 'CONFIRMED'),
        PENDING: trestleBoard.members.filter(m => m.status === 'PENDING'),
        DECLINED: trestleBoard.members.filter(m => m.status === 'DECLINED'),
        MAYBE: trestleBoard.members.filter(m => m.status === 'MAYBE'),
      };

      return NextResponse.json({
        trestleBoard: {
          id: trestleBoard.id,
          title: trestleBoard.title,
          date: trestleBoard.date,
          time: trestleBoard.time,
          location: trestleBoard.location,
          category: trestleBoard.category,
          isRSVP: trestleBoard.isRSVP,
          maxAttendees: trestleBoard.maxAttendees,
          description: trestleBoard.description,
        },
        rsvpCounts,
        isMaxAttendeesReached,
        participantsByStatus,
        allParticipants: trestleBoard.members.map(member => ({
          id: member.id,
          user: member.user,
          status: member.status,
          createdAt: member.createdAt,
          signedUpBy: member.signedUpByUser,
        })),
      });
    } catch (error) {
      console.error('Error fetching trestle board RSVP admin data:', error);
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

      // Get trestle board
      const trestleBoard = await prisma.trestleBoard.findUnique({
        where: { id: params.id },
        include: {
          members: {
            where: { status: 'CONFIRMED' },
          },
        },
      });

      if (!trestleBoard) {
        return NextResponse.json(
          { error: 'Trestle board not found' },
          { status: 404 }
        );
      }

      if (!trestleBoard.isRSVP) {
        return NextResponse.json(
          { error: 'RSVP is not enabled for this trestle board' },
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
      if (status === 'CONFIRMED' && trestleBoard.maxAttendees) {
        if (trestleBoard.members.length >= trestleBoard.maxAttendees) {
          return NextResponse.json(
            { error: 'Maximum number of attendees reached' },
            { status: 400 }
          );
        }
      }

      // Upsert RSVP (create or update)
      const rsvp = await prisma.trestleBoardMember.upsert({
        where: {
          trestleBoardId_userId: {
            trestleBoardId: params.id,
            userId: userId,
          },
        },
        update: {
          status,
          signedUpBy: authenticatedReq.user.userId,
        },
        create: {
          trestleBoardId: params.id,
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
          message: `Your RSVP for "${trestleBoard.title}" has been updated to ${status} by an admin`,
          type: 'EVENT_UPDATE' as any,
          relatedId: params.id,
          relatedType: 'trestle_board',
        });

        // Send push notification to target user if they have it enabled
        if (targetUser.lcmEnabled) {
          await LCMService.sendToUsers([userId], {
            title: 'RSVP Updated',
            body: `Your RSVP for "${trestleBoard.title}" has been updated to ${status}`,
            data: {
              type: 'trestle_board_rsvp_update',
              action: 'admin_updated_rsvp',
              trestleBoardId: params.id,
              itemTitle: trestleBoard.title,
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
      console.error('Error updating trestle board RSVP (admin):', error);
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

      // Get trestle board
      const trestleBoard = await prisma.trestleBoard.findUnique({
        where: { id: params.id },
      });

      if (!trestleBoard) {
        return NextResponse.json(
          { error: 'Trestle board not found' },
          { status: 404 }
        );
      }

      if (!trestleBoard.isRSVP) {
        return NextResponse.json(
          { error: 'RSVP is not enabled for this trestle board' },
          { status: 400 }
        );
      }

      // Delete RSVP
      await prisma.trestleBoardMember.deleteMany({
        where: {
          trestleBoardId: params.id,
          userId: userId,
        },
      });

      // Send notification to user
      try {
        await NotificationService.createNotification({
          userId: userId,
          title: 'RSVP Removed',
          message: `Your RSVP for "${trestleBoard.title}" has been removed by an admin`,
          type: 'EVENT_UPDATE' as any,
          relatedId: params.id,
          relatedType: 'trestle_board',
        });
      } catch (notificationError) {
        console.error('Error sending notification:', notificationError);
      }

      return NextResponse.json(
        { message: 'RSVP removed successfully' },
        { status: 200 }
      );
    } catch (error) {
      console.error('Error removing trestle board RSVP (admin):', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

