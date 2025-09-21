import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

// GET /api/admin/chat/rooms/group-chat - Get the existing "Group Chat" room
export async function GET(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      // Find the existing "Group Chat" room
      const groupChat = await prisma.chatRoom.findFirst({
        where: { 
          isGroupChat: true, 
          name: 'Group Chat' 
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  profileImage: true,
                  status: true,
                },
              },
            },
          },
        },
      });

      if (!groupChat) {
        return NextResponse.json(
          { error: 'Group Chat not found' },
          { status: 404 }
        );
      }

      const transformedGroupChat = {
        id: groupChat.id,
        isGroup: groupChat.isGroupChat,
        name: groupChat.name,
        participants: groupChat.participants.map(p => p.user),
        lastMessage: undefined,
        unreadCount: 0,
        updatedAt: groupChat.updatedAt.toISOString(),
      };

      return NextResponse.json(transformedGroupChat);
    } catch (error) {
      console.error('Error fetching Group Chat:', error);
      return NextResponse.json(
        { error: 'Failed to fetch Group Chat' },
        { status: 500 }
      );
    }
  });
}
