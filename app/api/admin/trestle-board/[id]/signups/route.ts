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

      const signups = await prisma.trestleBoardMember.findMany({
        where: {
          trestleBoardId: params.id,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              membershipNumber: true,
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
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Transform the data to match frontend expectations
      const transformedSignups = signups.map(signup => ({
        id: signup.id,
        status: signup.status,
        user: {
          id: signup.user.id,
          name: `${signup.user.firstName} ${signup.user.lastName}`,
          email: signup.user.email,
          membershipNumber: signup.user.membershipNumber,
          phone: signup.user.phone,
        },
        admin: signup.signedUpByUser ? {
          id: signup.signedUpByUser.id,
          name: `${signup.signedUpByUser.firstName} ${signup.signedUpByUser.lastName}`,
        } : undefined,
        createdAt: signup.createdAt.toISOString(),
        updatedAt: signup.createdAt.toISOString(),
      }));

      return NextResponse.json(transformedSignups);
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

      const signup = await prisma.trestleBoardMember.update({
        where: { id: signupId },
        data: {
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