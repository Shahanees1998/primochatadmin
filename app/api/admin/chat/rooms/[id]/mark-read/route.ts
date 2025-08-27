import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
    return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
        try {
            const chatRoomId = params.id;
            const userId = authenticatedReq.user?.userId;

            if (!userId) {
                return NextResponse.json(
                    { error: 'Authentication required' },
                    { status: 401 }
                );
            }

            if (!chatRoomId) {
                return NextResponse.json(
                    { error: 'chatRoomId is required' },
                    { status: 400 }
                );
            }

            // Verify user is a participant in the chat room
            const chatRoom = await prisma.chatRoom.findFirst({
                where: {
                    id: chatRoomId,
                    participants: {
                        some: {
                            userId: userId
                        }
                    }
                }
            });

            if (!chatRoom) {
                return NextResponse.json(
                    { error: 'Chat room not found or access denied' },
                    { status: 404 }
                );
            }

            // Mark all unread messages from other users in this room as read
            const result = await prisma.message.updateMany({
                where: {
                    chatRoomId: chatRoomId,
                    senderId: { not: userId },
                    isRead: false
                },
                data: { isRead: true }
            });

            return NextResponse.json({
                message: `Marked ${result.count} messages as read`,
                count: result.count
            });
        } catch (error) {
            console.error('Error marking room messages as read:', error);
            return NextResponse.json(
                { error: 'Failed to mark room messages as read' },
                { status: 500 }
            );
        }
    });
}


