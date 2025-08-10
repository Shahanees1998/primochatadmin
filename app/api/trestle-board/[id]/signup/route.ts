import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';
import { NotificationService } from '@/lib/notificationService';

export async function POST(
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

      // Check if user is already signed up
      const existingSignup = await prisma.trestleBoardMember.findFirst({
        where: {
          trestleBoardId: params.id,
          userId: authenticatedReq.user.userId,
        },
      });

      if (existingSignup) {
        return NextResponse.json(
          { error: 'You are already signed up for this trestle board' },
          { status: 400 }
        );
      }

      // Create signup
      const signup = await prisma.trestleBoardMember.create({
        data: {
          trestleBoardId: params.id,
          userId: authenticatedReq.user.userId,
          status: 'CONFIRMED',
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
          trestleBoard: {
            select: {
              id: true,
              title: true,
              date: true,
              time: true,
              location: true,
            },
          },
        },
      });

      // Create notification for trestle board addition
      try {
        await NotificationService.createTrestleBoardNotification(
          authenticatedReq.user.userId,
          {
            id: params.id,
            title: trestleBoard.title
          }
        );
      } catch (notificationError) {
        console.error('Error creating trestle board notification:', notificationError);
        // Don't fail the request if notification creation fails
      }

      return NextResponse.json({
        success: true,
        message: 'Successfully signed up for trestle board',
        signup,
      }, { status: 201 });
    } catch (error) {
      console.error('Trestle board signup error:', error);
      return NextResponse.json(
        { error: 'Failed to sign up for trestle board' },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      if (!authenticatedReq.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const signup = await prisma.trestleBoardMember.findFirst({
        where: {
          trestleBoardId: params.id,
          userId: authenticatedReq.user.userId,
        },
      });

      if (!signup) {
        return NextResponse.json(
          { error: 'Signup not found' },
          { status: 404 }
        );
      }

      await prisma.trestleBoardMember.delete({
        where: { id: signup.id },
      });

      return NextResponse.json({ message: 'Signup cancelled successfully' });
    } catch (error) {
      console.error('Error cancelling signup:', error);
      return NextResponse.json(
        { error: 'Failed to cancel signup' },
        { status: 500 }
      );
    }
  });
} 