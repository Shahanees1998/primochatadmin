import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
        try {
            const messageId = params.id;
            const userId = authenticatedReq.user?.userId;

            if (!userId) {
                return NextResponse.json(
                    { error: 'Authentication required' },
                    { status: 401 }
                );
            }

            if (!messageId) {
                return NextResponse.json(
                    { error: 'Message ID is required' },
                    { status: 400 }
                );
            }

            // Check if the message exists and the user is a participant in the chat
            const message = await prisma.message.findFirst({
                where: {
                    id: messageId,
                    chatRoom: {
                        participants: {
                            some: {
                                userId: userId
                            }
                        }
                    }
                },
                include: {
                    chatRoom: {
                        include: {
                            participants: {
                                include: {
                                    user: true
                                }
                            }
                        }
                    }
                }
            });

            if (!message) {
                return NextResponse.json(
                    { error: 'Message not found or access denied' },
                    { status: 404 }
                );
            }

            // Mark the message as read
            const updatedMessage = await prisma.message.update({
                where: { id: messageId },
                data: { isRead: true },
                include: {
                    sender: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            profileImage: true,
                        },
                    },
                },
            });

            return NextResponse.json({
                ...updatedMessage,
                createdAt: updatedMessage.createdAt.toISOString(),
            });
        } catch (error) {
            console.error('Error marking message as read:', error);
            return NextResponse.json(
                { error: 'Failed to mark message as read' },
                { status: 500 }
            );
        }
    });
} 