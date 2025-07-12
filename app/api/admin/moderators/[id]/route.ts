import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const moderator = await prisma.moderator.findUnique({
            where: { id: params.id },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: true,
                        status: true,
                    },
                },
            },
        });

        if (!moderator) {
            return NextResponse.json(
                { error: 'Moderator not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(moderator);
    } catch (error) {
        console.error('Error fetching moderator:', error);
        return NextResponse.json(
            { error: 'Failed to fetch moderator' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const { permissions, assignedAreas, isActive } = body;

        const moderator = await prisma.moderator.update({
            where: { id: params.id },
            data: {
                permissions,
                assignedAreas,
                isActive,
            },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: true,
                        status: true,
                    },
                },
            },
        });

        return NextResponse.json(moderator);
    } catch (error) {
        console.error('Error updating moderator:', error);
        return NextResponse.json(
            { error: 'Failed to update moderator' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await prisma.moderator.delete({ where: { id: params.id } });

        return NextResponse.json({ message: 'Moderator deleted successfully' });
    } catch (error) {
        console.error('Error deleting moderator:', error);
        return NextResponse.json(
            { error: 'Failed to delete moderator' },
            { status: 500 }
        );
    }
} 