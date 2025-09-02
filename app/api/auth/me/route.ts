import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    const user = authenticatedReq.user;
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Fetch complete user data from database to include all fields
    const completeUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        status: true,
        membershipNumber: true,
        profileImage: true,
        profileImagePublicId: true,
        joinDate: true,
        paidDate: true,
        lastLogin: true,
        isPasswordChanged: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!completeUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: completeUser,
    });
  });
} 