import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      if (!authenticatedReq.user || authenticatedReq.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const signups = await prisma.trestleBoardSignup.findMany({
        where: {
          trestleBoardId: params.id,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              membershipNumber: true,
              phone: true,
            },
          },
          admin: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return NextResponse.json(signups);
    } catch (error) {
      console.error('Error fetching trestle board signups:', error);
      return NextResponse.json(
        { error: 'Failed to fetch signups' },
        { status: 500 }
      );
    }
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      if (!authenticatedReq.user || authenticatedReq.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const body = await request.json();
      const { signupId, status } = body;

      if (!signupId || !status) {
        return NextResponse.json(
          { error: 'Signup ID and status are required' },
          { status: 400 }
        );
      }

      if (!['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status' },
          { status: 400 }
        );
      }

      const signup = await prisma.trestleBoardSignup.update({
        where: { id: signupId },
        data: {
          status,
          adminId: authenticatedReq.user.userId,
          updatedAt: new Date(),
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

      return NextResponse.json(signup);
    } catch (error) {
      console.error('Error updating signup status:', error);
      return NextResponse.json(
        { error: 'Failed to update signup status' },
        { status: 500 }
      );
    }
  });
} 