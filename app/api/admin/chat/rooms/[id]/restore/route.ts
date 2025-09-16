import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

// POST /api/admin/chat/rooms/[id]/restore - Restore a deleted chat for user
export async function POST(
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

      // Check if user has deleted this chat
      const userDeletion = await prisma.chatUserDeletion.findUnique({
        where: {
          chatRoomId_userId: {
            chatRoomId: chatRoomId,
            userId: userId,
          },
        },
      });

      if (!userDeletion) {
        return NextResponse.json(
          { error: 'Chat is not deleted for you' },
          { status: 400 }
        );
      }

      // Remove the deletion record
      await prisma.chatUserDeletion.delete({
        where: {
          chatRoomId_userId: {
            chatRoomId: chatRoomId,
            userId: userId,
          },
        },
      });

      return NextResponse.json({
        message: 'Chat room restored successfully',
      });
    } catch (error) {
      console.error('Restore chat room error:', error);
      return NextResponse.json(
        { error: 'Failed to restore chat room' },
        { status: 500 }
      );
    }
  });
}
