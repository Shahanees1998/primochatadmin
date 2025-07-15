import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';

export async function GET(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    const user = authenticatedReq.user;
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.userId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        membershipNumber: user.membershipNumber,
        profileImage: user.profileImage,
      },
    });
  });
} 