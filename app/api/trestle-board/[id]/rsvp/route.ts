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

      if (!trestleBoard) {
        return NextResponse.json(
          { error: 'Trestle board not found' },
          { status: 404 }
        );
      }

      // Check if RSVP is enabled for this trestle board
      if (!trestleBoard.isRSVP) {
        return NextResponse.json(
          { error: 'RSVP is not enabled for this trestle board' },
          { status: 400 }
        );
      }

      // Find current user's RSVP status
      const userRSVP = trestleBoard.members.find(
        (member) => member.userId === authenticatedReq.user?.userId
      );

      // Count RSVPs by status
      const rsvpCounts = {
        CONFIRMED: trestleBoard.members.filter(m => m.status === 'CONFIRMED').length,
        PENDING: trestleBoard.members.filter(m => m.status === 'PENDING').length,
        DECLINED: trestleBoard.members.filter(m => m.status === 'DECLINED').length,
        MAYBE: trestleBoard.members.filter(m => m.status === 'MAYBE').length,
      };

      // Check if max attendees is reached
      const isMaxAttendeesReached = trestleBoard.maxAttendees 
        ? rsvpCounts.CONFIRMED >= trestleBoard.maxAttendees 
        : false;

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
        },
        userRSVP: userRSVP ? {
          id: userRSVP.id,
          status: userRSVP.status,
          createdAt: userRSVP.createdAt,
          signedUpBy: userRSVP.signedUpByUser,
        } : null,
        rsvpCounts,
        isMaxAttendeesReached,
        participants: trestleBoard.members.map(member => ({
          id: member.id,
          user: member.user,
          status: member.status,
          createdAt: member.createdAt,
          signedUpBy: member.signedUpByUser,
        })),
      });
    } catch (error) {
      console.error('Error fetching trestle board RSVP:', error);
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
            userId: authenticatedReq.user!.userId,
          },
        },
        update: {
          status,
        },
        create: {
          trestleBoardId: params.id,
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
          message: `Your RSVP for "${trestleBoard.title}" has been updated to ${status}`,
          type: 'EVENT_UPDATE' as any,
          relatedId: params.id,
          relatedType: 'trestle_board',
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
            title: 'Trestle Board RSVP Update',
            body: `${rsvp.user.firstName} ${rsvp.user.lastName} RSVP'd ${status} for ${trestleBoard.title}`,
            data: {
              type: 'trestle_board_rsvp_update',
              action: 'rsvp_updated',
              trestleBoardId: params.id,
              itemTitle: trestleBoard.title,
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
      console.error('Error updating trestle board RSVP:', error);
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
          userId: authenticatedReq.user!.userId,
        },
      });

      return NextResponse.json(
        { message: 'RSVP removed successfully' },
        { status: 200 }
      );
    } catch (error) {
      console.error('Error removing trestle board RSVP:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

