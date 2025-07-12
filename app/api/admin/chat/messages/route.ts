import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { chatRoomId, content, type } = body;
        // Get or create admin user
        const adminUser = await prisma.user.findFirst({
            where: {
                role: 'ADMIN',
                status: 'ACTIVE'
            }
        }) || await prisma.user.create({
            data: {
                firstName: 'Admin',
                lastName: 'User',
                email: 'admin@primochat.com',
                password: 'adminPassword123',
                role: 'ADMIN',
                status: 'ACTIVE',
                membershipNumber: 'ADMIN001'
            }
        });
        
        const senderId = adminUser.id;

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
} 