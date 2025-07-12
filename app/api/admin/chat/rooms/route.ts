import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper function to get or create admin user
async function getOrCreateAdminUser() {
    // First try to find an existing admin user
    let adminUser = await prisma.user.findFirst({
        where: {
            role: 'ADMIN',
            status: 'ACTIVE'
        }
    });

    // If no admin user exists, create one
    if (!adminUser) {
        adminUser = await prisma.user.create({
            data: {
                firstName: 'Admin',
                lastName: 'User',
                email: 'admin@primochat.com',
                password: 'adminPassword123', // This should be changed in production
                role: 'ADMIN',
                status: 'ACTIVE',
                membershipNumber: 'ADMIN001'
            }
        });
    }

    return adminUser;
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        // Get or create admin user
        const adminUser = await getOrCreateAdminUser();
        const currentUserId = userId || adminUser.id;

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
            isGroup: room.isGroup,
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
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { participantIds, isGroup, name } = body;

        // Get or create admin user
        const adminUser = await getOrCreateAdminUser();
        const currentUserId = adminUser.id;

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

        // Check if a direct chat already exists between two users
        if (!isGroup && allParticipantIds.length === 2) {
            const existingChat = await prisma.chatRoom.findFirst({
                where: {
                    isGroup: false,
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
                    isGroup: existingChat.isGroup,
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
                isGroup,
                name: isGroup ? name : undefined,
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
} 