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

      // Get all chat rooms where user is a participant
      const allUserChatRooms = await prisma.chatRoom.findMany({
        where: {
          participants: {
            some: {
              userId: userId,
            },
          },
        },
        select: {
          id: true,
          userDeletions: {
            where: {
              userId: userId,
            },
            select: {
              deletedAt: true,
            },
          },
        },
      });

      // Filter chat rooms and calculate unread counts
      let totalUnreadCount = 0;
      const chatRoomUnreadCounts: Array<{ chatRoomId: string; unreadCount: number }> = [];

      for (const room of allUserChatRooms) {
        const userDeletion = room.userDeletions[0];
        
        // Build message filter conditions
        const messageFilter: any = {
          chatRoomId: room.id,
          senderId: {
            not: userId, // Exclude messages sent by the user
          },
          isRead: false,
        };

        // If user deleted this chat, only count messages after deletion
        if (userDeletion) {
          messageFilter.createdAt = {
            gt: userDeletion.deletedAt,
          };
        }

        // Count unread messages for this room
        const roomUnreadCount = await prisma.message.count({
          where: messageFilter,
        });

        if (roomUnreadCount > 0) {
          totalUnreadCount += roomUnreadCount;
          chatRoomUnreadCounts.push({
            chatRoomId: room.id,
            unreadCount: roomUnreadCount,
          });
        }
      }

      return NextResponse.json({
        totalUnreadCount: totalUnreadCount,
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
