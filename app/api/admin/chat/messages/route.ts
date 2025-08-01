import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';

export async function POST(request: NextRequest) {
    return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
        const body = await request.json();
        const { chatRoomId, content, type } = body;
            
            // Use the authenticated user's ID as sender
            const senderId = authenticatedReq.user?.userId;
            
            if (!senderId) {
                return NextResponse.json(
                    { error: 'Authentication required' },
                    { status: 401 }
                );
            }

        if (!chatRoomId || !content) {
            return NextResponse.json(
                { error: 'chatRoomId and content are required' },
                { status: 400 }
            );
        }

        const message = await prisma.message.create({
            data: {
                chatRoomId,
                senderId,
                content,
                type: type || 'TEXT',
                isRead: false,
            },
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

        // Update chat room's updatedAt
        await prisma.chatRoom.update({
            where: { id: chatRoomId },
            data: { updatedAt: new Date() },
        });

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