import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';
import { NotificationService } from '@/lib/notificationService';
import { LCMService } from '@/lib/lcmService';

// GET - Get RSVP status for current user and list of all RSVP participants
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      if (!authenticatedReq.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });

      if (!festiveBoard) {
        return NextResponse.json(
          { error: 'Festive board not found' },
          { status: 404 }
        );
      }

      // Check if RSVP is enabled for this festive board
      if (!festiveBoard.isRSVP) {
        return NextResponse.json(
          { error: 'RSVP is not enabled for this festive board' },
          { status: 400 }
        );
      }

      // Find current user's RSVP status
      const userRSVP = festiveBoard.rsvpMembers.find(
        (rsvp) => rsvp.userId === authenticatedReq.user?.userId
      );

      // Count RSVPs by status
      const rsvpCounts = {
        CONFIRMED: festiveBoard.rsvpMembers.filter(r => r.status === 'CONFIRMED').length,
        PENDING: festiveBoard.rsvpMembers.filter(r => r.status === 'PENDING').length,
        DECLINED: festiveBoard.rsvpMembers.filter(r => r.status === 'DECLINED').length,
        MAYBE: festiveBoard.rsvpMembers.filter(r => r.status === 'MAYBE').length,
      };

      // Check if max attendees is reached
      const isMaxAttendeesReached = festiveBoard.maxAttendees 
        ? rsvpCounts.CONFIRMED >= festiveBoard.maxAttendees 
        : false;

      return NextResponse.json({
        festiveBoard: {
          id: festiveBoard.id,
          title: festiveBoard.title,
          date: festiveBoard.date,
          isRSVP: festiveBoard.isRSVP,
          maxAttendees: festiveBoard.maxAttendees,
        },
        userRSVP: userRSVP ? {
          id: userRSVP.id,
          status: userRSVP.status,
          createdAt: userRSVP.createdAt,
          updatedAt: userRSVP.updatedAt,
          signedUpBy: userRSVP.signedUpByUser,
        } : null,
        rsvpCounts,
        isMaxAttendeesReached,
        participants: festiveBoard.rsvpMembers.map(rsvp => ({
          id: rsvp.id,
          user: rsvp.user,
          status: rsvp.status,
          createdAt: rsvp.createdAt,
          updatedAt: rsvp.updatedAt,
          signedUpBy: rsvp.signedUpByUser,
        })),
      });
    } catch (error) {
      console.error('Error fetching festive board RSVP:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

// POST - Create or update RSVP for current user
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      if (!authenticatedReq.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { status } = await request.json();

      if (!status || !['CONFIRMED', 'PENDING', 'DECLINED', 'MAYBE'].includes(status)) {
        return NextResponse.json(
          { error: 'Invalid RSVP status' },
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
            userId: authenticatedReq.user!.userId,
          },
        },
        update: {
          status,
          updatedAt: new Date(),
        },
        create: {
          festiveBoardId: params.id,
          userId: authenticatedReq.user!.userId,
          status,
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

      // Send notifications
      try {
        // Create in-app notification
        await NotificationService.createNotification({
          userId: authenticatedReq.user!.userId,
          title: 'RSVP Updated',
          message: `Your RSVP for "${festiveBoard.title}" has been updated to ${status}`,
          type: 'FESTIVE_BOARD_UPDATE' as any,
          relatedId: params.id,
          relatedType: 'festive_board',
        });

        // Send push notification to admins
        const adminUsers = await prisma.user.findMany({
          where: { 
            role: { in: ['ADMIN', 'ADMINLEVELTWO', 'ADMINLEVELTHREE'] },
            lcmEnabled: true,
            id: { not: authenticatedReq.user!.userId },
          },
          select: { id: true },
        });

        if (adminUsers.length > 0) {
          await LCMService.sendToUsers(adminUsers.map(u => u.id), {
            title: 'Festive Board RSVP Update',
            body: `${rsvp.user.firstName} ${rsvp.user.lastName} RSVP'd ${status} for ${festiveBoard.title}`,
            data: {
              type: 'festive_board_rsvp_update',
              action: 'rsvp_updated',
              festiveBoardId: params.id,
              itemTitle: festiveBoard.title,
              userName: `${rsvp.user.firstName} ${rsvp.user.lastName}`,
              userId: authenticatedReq.user!.userId,
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
      console.error('Error updating festive board RSVP:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

// DELETE - Remove RSVP for current user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      if (!authenticatedReq.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
          userId: authenticatedReq.user!.userId,
        },
      });

      return NextResponse.json(
        { message: 'RSVP removed successfully' },
        { status: 200 }
      );
    } catch (error) {
      console.error('Error removing festive board RSVP:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
