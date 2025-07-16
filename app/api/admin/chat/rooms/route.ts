import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';

export async function GET(request: NextRequest) {
    return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
        try {
            const { searchParams } = new URL(request.url);
            const userId = searchParams.get('userId');

            // Use authenticated user or provided userId
            const currentUserId = userId || authenticatedReq.user?.userId;
            
            if (!currentUserId) {
                return NextResponse.json(
                    { error: 'User ID is required' },
                    { status: 400 }
                );
            }

        // Get all chat rooms where the user is a participant
        const chatRooms = await prisma.chatRoom.findMany({
            where: {
                participants: {
                    some: {
                        userId: currentUserId
                    }
                }
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
                messages: {
                    orderBy: {
                        createdAt: 'desc',
                    },
                    take: 1,
                    include: {
                        sender: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        messages: {
                            where: {
                                isRead: false,
                                senderId: {
                                    not: currentUserId,
                                },
                            },
                        },
                    },
                },
            },
            orderBy: {
                updatedAt: 'desc',
            },
        });

        // Transform the data to match the frontend expectations
        const transformedChatRooms = chatRooms.map(room => ({
            id: room.id,
            isGroup: room.isGroupChat,
            name: room.name,
            participants: room.participants.map(p => p.user),
            lastMessage: room.messages[0] ? {
                id: room.messages[0].id,
                content: room.messages[0].content,
                senderId: room.messages[0].senderId,
                type: room.messages[0].type,
                isRead: room.messages[0].isRead,
                createdAt: room.messages[0].createdAt.toISOString(),
                sender: room.messages[0].sender,
            } : undefined,
            unreadCount: room._count.messages,
            updatedAt: room.updatedAt.toISOString(),
        }));

            return NextResponse.json({
                chatRooms: transformedChatRooms,
            });
        } catch (error) {
            console.error('Error fetching chat rooms:', error);
            return NextResponse.json(
                { error: 'Failed to fetch chat rooms' },
                { status: 500 }
            );
        }
    });
}

export async function POST(request: NextRequest) {
    return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
        try {
            const body = await request.json();
            const { participantIds, isGroup, name } = body;

            // Use authenticated user
            const currentUserId = authenticatedReq.user?.userId;
            console.log(body,'LLllllllllllllllllllll');
            console.log(authenticatedReq,'LLllllllllllllllllllll current');
            if (!currentUserId) {
                return NextResponse.json(
                    { error: 'Authentication required' },
                    { status: 401 }
                );
            }

        // Validate required fields
        if (!participantIds || participantIds.length === 0) {
            return NextResponse.json(
                { error: 'At least one participant is required' },
                { status: 400 }
            );
        }

        // Add current user to participants if not already included
        const allParticipantIds: string[] = participantIds.includes(currentUserId) 
            ? participantIds 
            : [currentUserId, ...participantIds];

        // Determine if this should be a group chat based on number of participants
        const isGroupChat = allParticipantIds.length > 2;

        // Check if a direct chat already exists between two users
        if (!isGroupChat && allParticipantIds.length === 2) {
            const existingChat = await prisma.chatRoom.findFirst({
                where: {
                    isGroupChat: false,
                    participants: {
                        every: {
                            userId: {
                                in: allParticipantIds,
                            },
                        },
                    },
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

            if (existingChat) {
                const transformedExistingChat = {
                    id: existingChat.id,
                    isGroup: existingChat.isGroupChat,
                    name: existingChat.name,
                    participants: existingChat.participants.map(p => p.user),
                    lastMessage: undefined,
                    unreadCount: 0,
                    updatedAt: existingChat.updatedAt.toISOString(),
                };
                return NextResponse.json(transformedExistingChat, { status: 200 });
            }
        }

        // Create new chat room
        const chatRoom = await prisma.chatRoom.create({
            data: {
                isGroupChat,
                name: isGroupChat ? name : undefined,
                participants: {
                    create: allParticipantIds.map((userId: string) => ({
                        userId,
                    })),
                },
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

        const transformedChatRoom = {
            id: chatRoom.id,
            isGroup: chatRoom.isGroup,
            name: chatRoom.name,
            participants: chatRoom.participants.map(p => p.user),
            lastMessage: undefined,
            unreadCount: 0,
            updatedAt: chatRoom.updatedAt.toISOString(),
        };

            return NextResponse.json(transformedChatRoom, { status: 201 });
        } catch (error) {
            console.error('Error creating chat room:', error);
            return NextResponse.json(
                { error: 'Failed to create chat room' },
                { status: 500 }
            );
        }
    });
}