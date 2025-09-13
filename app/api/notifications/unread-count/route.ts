import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/notifications/unread-count - Get unread notifications count for user
export async function GET(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const unreadCount = await prisma.notification.count({
        where: {
          userId: authenticatedReq.user!.userId,
          isRead: false,
        },
      });

      return NextResponse.json({
        unreadCount,
        userId: authenticatedReq.user!.userId,
      });
    } catch (error) {
      console.error('Get unread count error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch unread count' },
        { status: 500 }
      );
    }
  });
}
