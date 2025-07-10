import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/membership-card - Get user's membership card
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        membershipNumber: true,
        joinDate: true,
        role: true,
        status: true,
        profileImage: true,
        phoneBookEntry: {
          select: { phone: true, address: true },
        },
      },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    // Generate membership card data
    const membershipCard = {
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      membershipNumber: user.membershipNumber || 'N/A',
      joinDate: user.joinDate,
      role: user.role,
      status: user.status,
      profileImage: user.profileImage,
      phone: user.phoneBookEntry?.phone,
      address: user.phoneBookEntry?.address,
      cardNumber: user.membershipNumber ? `MC-${user.membershipNumber}` : `MC-${user.id.slice(-8)}`,
      validUntil: user.joinDate ? new Date(user.joinDate.getTime() + 365 * 24 * 60 * 60 * 1000) : null,
    };
    return NextResponse.json({ membershipCard });
  } catch (error) {
    console.error('Get membership card error:', error);
    return NextResponse.json({ error: 'Failed to fetch membership card' }, { status: 500 });
  }
} 