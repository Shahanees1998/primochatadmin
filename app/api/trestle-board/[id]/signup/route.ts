import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      if (!authenticatedReq.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Check if trestle board exists
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
      const existingSignup = await prisma.trestleBoardSignup.findFirst({
        where: {
          trestleBoardId: params.id,
          userId: authenticatedReq.user.userId,
        },
      });

      if (existingSignup) {
        return NextResponse.json(
          { error: 'Already signed up for this event' },
          { status: 400 }
        );
      }

      const signup = await prisma.trestleBoardSignup.create({
        data: {
          trestleBoardId: params.id,
          userId: authenticatedReq.user.userId,
          status: 'CONFIRMED',
          adminId: null, // Will be set by admin when approved
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              membershipNumber: true,
            },
          },
        },
      });

      return NextResponse.json(signup, { status: 201 });
    } catch (error) {
      console.error('Error signing up for trestle board:', error);
      return NextResponse.json(
        { error: 'Failed to sign up for event' },
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

      const signup = await prisma.trestleBoardSignup.findFirst({
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

      await prisma.trestleBoardSignup.delete({
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