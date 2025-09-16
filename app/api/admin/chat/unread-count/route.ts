import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

// GET /api/admin/chat/unread-count - Get total unread messages count for user
export async function GET(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const userId = authenticatedReq.user?.userId;

      if (!userId) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      // Get all chat rooms where user is a participant and not deleted by this user
      const userChatRooms = await prisma.chatRoom.findMany({
        where: {
          participants: {
            some: {
              userId: userId,
            },
          },
          // Exclude chats that this user has deleted
          userDeletions: {
            none: {
              userId: userId,
            },
          },
        },
        select: {
          id: true,
        },
      });

      const chatRoomIds = userChatRooms.map((room) => room.id);

      // Count unread messages across all user's chat rooms
      const unreadCount = await prisma.message.count({
        where: {
          chatRoomId: {
            in: chatRoomIds,
          },
          senderId: {
            not: userId, // Exclude messages sent by the user
          },
          isRead: false,
        },
      });

      // Get unread count per chat room
      const unreadCountsPerRoom = await prisma.message.groupBy({
        by: ['chatRoomId'],
        where: {
          chatRoomId: {
            in: chatRoomIds,
          },
          senderId: {
            not: userId,
          },
          isRead: false,
        },
        _count: {
          id: true,
        },
      });

      // Format the response
      const chatRoomUnreadCounts = unreadCountsPerRoom.map((item) => ({
        chatRoomId: item.chatRoomId,
        unreadCount: item._count.id,
      }));

      return NextResponse.json({
        totalUnreadCount: unreadCount,
        chatRoomUnreadCounts: chatRoomUnreadCounts,
      });
    } catch (error) {
      console.error('Get unread count error:', error);
      return NextResponse.json(
        { error: 'Failed to get unread count' },
        { status: 500 }
      );
    }
  });
}
