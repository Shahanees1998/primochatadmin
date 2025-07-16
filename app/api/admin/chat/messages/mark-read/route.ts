import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';

export async function PATCH(request: NextRequest) {
    return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
        try {
            const body = await request.json();
            const { messageIds, chatRoomId } = body;
            const userId = authenticatedReq.user?.userId;

            if (!userId) {
                return NextResponse.json(
                    { error: 'Authentication required' },
                    { status: 401 }
                );
            }

            if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
                return NextResponse.json(
                    { error: 'messageIds array is required' },
                    { status: 400 }
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

            // Mark all messages as read
            const result = await prisma.message.updateMany({
                where: {
                    id: { in: messageIds },
                    chatRoomId: chatRoomId,
                    senderId: { not: userId }, // Only mark messages from others as read
                    isRead: false
                },
                data: { isRead: true }
            });

            return NextResponse.json({
                message: `Marked ${result.count} messages as read`,
                count: result.count
            });
        } catch (error) {
            console.error('Error marking messages as read:', error);
            return NextResponse.json(
                { error: 'Failed to mark messages as read' },
                { status: 500 }
            );
        }
    });
} 