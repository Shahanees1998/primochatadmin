import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '30');
        const sortOrder = searchParams.get('sortOrder') === '1' ? 'asc' : 'desc';
        const skip = (page - 1) * limit;
        const chatRoomId = params.id;

        // Fetch messages for the chat room
        const [messages, total] = await Promise.all([
            prisma.message.findMany({
                where: { chatRoomId },
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
            prisma.message.count({ where: { chatRoomId } }),
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
} 