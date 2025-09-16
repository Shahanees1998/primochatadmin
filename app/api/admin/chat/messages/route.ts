import { NextRequest, NextResponse } from 'next/server';
import prismadb from '@/configs/prismadb';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { pusherServer } from '@/lib/realtime';
import { NotificationService } from '@/lib/notificationService';

export async function POST(request: NextRequest) {
    return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
        try {
            const { chatRoomId, content, type = 'TEXT' } = await request.json();
            const senderId = authenticatedReq.user?.userId;

            if (!senderId) {
                return NextResponse.json(
                    { error: 'Authentication required' },
                    { status: 401 }
                );
            }

            if (!chatRoomId || !content) {
                return NextResponse.json(
                    { error: 'Chat room ID and content are required' },
                    { status: 400 }
                );
            }

            // Don't automatically restore deleted chats - let users see only new messages

            // Create the message
            const message = await prismadb.message.create({
                data: {
                    chatRoomId,
                    senderId,
                    content,
                    type,
                    isRead: false
                },
                include: {
                    sender: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            profileImage: true,
                            status: true
                        }
                    }
                }
            });

            // Get chat room with participants
            const chatRoom = await prismadb.chatRoom.findUnique({
                where: { id: chatRoomId },
                include: {
                    participants: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    email: true,
                                }
                            }
                        }
                    },
                },
            });

            // Emit real-time via Pusher
            try {
                await pusherServer.trigger(`chat-${chatRoomId}`, 'new-message', {
                    chatRoomId,
                    message: {
                        ...message,
                        createdAt: message.createdAt.toISOString(),
                    },
                });
            } catch (error) {
                console.error('Pusher emit error:', error);
            }

            // Create notifications for other participants
            if (chatRoom) {
                const otherParticipants = chatRoom.participants
                    .map(p => p.user)
                    .filter(participant => participant.id !== senderId);

                for (const participant of otherParticipants) {
                    try {
                        await NotificationService.createChatMessageNotification(
                            participant.id,
                            message,
                            chatRoom
                        );
                    } catch (error) {
                        console.error(`Error creating notification for user ${participant.id}:`, error);
                    }
                }
            }

            return NextResponse.json({
                ...message,
                createdAt: message.createdAt.toISOString(),
            }, { status: 201 });
        } catch (error) {
            console.error('Error sending message:', error);
            return NextResponse.json(
                { error: 'Failed to send message' },
                { status: 500 }
            );
        }
    });
} 