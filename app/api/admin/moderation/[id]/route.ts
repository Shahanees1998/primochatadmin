import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const { isModerated, moderationAction, flagReason } = body;

        const message = await prisma.message.update({
            where: { id: params.id },
            data: {
                isModerated,
                moderationAction,
                flagReason,
            },
            include: {
                sender: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });

        return NextResponse.json(message);
    } catch (error) {
        console.error('Error updating message moderation:', error);
        return NextResponse.json(
            { error: 'Failed to update message moderation' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await prisma.message.delete({ where: { id: params.id } });
        return NextResponse.json({ message: 'Message deleted successfully' });
    } catch (error) {
        console.error('Error deleting message:', error);
        return NextResponse.json(
            { error: 'Failed to delete message' },
            { status: 500 }
        );
    }
} 