import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

// DELETE /api/admin/chat/rooms/[id]/delete - Soft delete a chat room
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const { id: chatRoomId } = params;
      const userId = authenticatedReq.user?.userId;

      if (!userId) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      // Check if the chat room exists and user is a participant
      const chatRoom = await prisma.chatRoom.findUnique({
        where: { id: chatRoomId },
        include: {
          participants: true,
        },
      });

      if (!chatRoom) {
        return NextResponse.json(
          { error: 'Chat room not found' },
          { status: 404 }
        );
      }

      // Check if user is a participant
      const isParticipant = chatRoom.participants.some(
        (participant) => participant.userId === userId
      );

      if (!isParticipant) {
        return NextResponse.json(
          { error: 'You are not a participant in this chat' },
          { status: 403 }
        );
      }

      // Check if user has already deleted this chat
      const existingDeletion = await prisma.chatUserDeletion.findUnique({
        where: {
          chatRoomId_userId: {
            chatRoomId: chatRoomId,
            userId: userId,
          },
        },
      });

      if (existingDeletion) {
        return NextResponse.json(
          { error: 'You have already deleted this chat' },
          { status: 400 }
        );
      }

      // Create user-specific deletion record
      const userDeletion = await prisma.chatUserDeletion.create({
        data: {
          chatRoomId: chatRoomId,
          userId: userId,
        },
        include: {
          chatRoom: {
            include: {
              participants: {
                include: {
                  user: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      return NextResponse.json({
        message: 'Chat room deleted successfully',
        chatRoom: userDeletion.chatRoom,
      });
    } catch (error) {
      console.error('Delete chat room error:', error);
      return NextResponse.json(
        { error: 'Failed to delete chat room' },
        { status: 500 }
      );
    }
  });
}
