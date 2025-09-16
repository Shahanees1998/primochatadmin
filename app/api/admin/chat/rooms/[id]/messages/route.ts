import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
        try {
            const userId = authenticatedReq.user?.userId;
            if (!userId) {
                return NextResponse.json(
                    { error: 'Authentication required' },
                    { status: 401 }
                );
            }

            const { searchParams } = new URL(request.url);
            const page = parseInt(searchParams.get('page') || '1');
            const limit = parseInt(searchParams.get('limit') || '50');
            // Default to newest first (desc) for better UX - new messages appear on screen
            const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';
            const skip = (page - 1) * limit;
            let chatRoomId = params.id;

        // Handle the case where 'general' is passed as room ID
        if (chatRoomId === 'general') {
            // Try to find the first available chat room or create a default one
            let defaultRoom = await prisma.chatRoom.findFirst({
                where: {
                    name: 'General'
                }
            });

            if (!defaultRoom) {
                // Create a default general chat room
                const adminUser = await prisma.user.findFirst({
                    where: { role: 'MEMBER' }
                });

                if (adminUser) {
                    defaultRoom = await prisma.chatRoom.create({
                        data: {
                            name: 'General',
                            isGroup: true,
                            participants: {
                                create: {
                                    userId: adminUser.id
                                }
                            }
                        }
                    });
                }
            }

            if (defaultRoom) {
                chatRoomId = defaultRoom.id;
            } else {
                // If we can't create a room, return empty results
                return NextResponse.json({
                    messages: [],
                    pagination: {
                        page,
                        limit,
                        total: 0,
                        totalPages: 0,
                    },
                });
            }
        }

        // Check if user is a participant in this chat room
        const isParticipant = await prisma.chatParticipant.findFirst({
            where: {
                chatRoomId: chatRoomId,
                userId: userId,
            },
        });

        if (!isParticipant) {
            return NextResponse.json(
                { error: 'You are not a participant in this chat room' },
                { status: 403 }
            );
        }

        // Check if user has deleted this chat and get deletion timestamp
        const userDeletion = await prisma.chatUserDeletion.findUnique({
            where: {
                chatRoomId_userId: {
                    chatRoomId: chatRoomId,
                    userId: userId,
                },
            },
        });

        // Build message filter - if user deleted chat, only show messages after deletion
        const messageFilter: any = { chatRoomId };
        if (userDeletion) {
            messageFilter.createdAt = {
                gt: userDeletion.deletedAt
            };
        }

        // Fetch messages for the chat room
        const [messages, total] = await Promise.all([
            prisma.message.findMany({
                where: messageFilter,
                orderBy: { createdAt: sortOrder },
                skip,
                take: limit,
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
            }),
            prisma.message.count({ where: messageFilter }),
        ]);

        return NextResponse.json({
            messages: messages.map(msg => ({
                ...msg,
                createdAt: msg.createdAt.toISOString(),
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
        } catch (error) {
            console.error('Error fetching chat messages:', error);
            return NextResponse.json(
                { error: 'Failed to fetch chat messages' },
                { status: 500 }
            );
        }
    });
} 