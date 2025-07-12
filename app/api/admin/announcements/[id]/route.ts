import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const { title, content, type, status, targetAudience, expiresAt } = body;

        // Validate required fields
        if (!title || !content || !type || !status || !targetAudience) {
            return NextResponse.json(
                { error: 'Title, content, type, status, and targetAudience are required' },
                { status: 400 }
            );
        }

        // Update announcement
        const announcement = await prisma.announcement.update({
            where: { id: params.id },
            data: {
                title,
                content,
                type,
                status,
                targetAudience,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                publishedAt: status === 'PUBLISHED' ? new Date() : undefined,
            },
            include: {
                createdBy: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });

        return NextResponse.json({
            ...announcement,
            createdAt: announcement.createdAt.toISOString(),
            updatedAt: announcement.updatedAt.toISOString(),
            publishedAt: announcement.publishedAt?.toISOString(),
            expiresAt: announcement.expiresAt?.toISOString(),
        });
    } catch (error) {
        console.error('Error updating announcement:', error);
        return NextResponse.json(
            { error: 'Failed to update announcement' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await prisma.announcement.delete({
            where: { id: params.id },
        });

        return NextResponse.json({ message: 'Announcement deleted successfully' });
    } catch (error) {
        console.error('Error deleting announcement:', error);
        return NextResponse.json(
            { error: 'Failed to delete announcement' },
            { status: 500 }
        );
    }
} 