import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const phoneBookEntry = await prisma.phoneBookEntry.findUnique({
            where: { id: params.id },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: true,
                        status: true,
                        profileImage: true,
                    },
                },
            },
        });

        if (!phoneBookEntry) {
            return NextResponse.json(
                { error: 'Phone book entry not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(phoneBookEntry);
    } catch (error) {
        console.error('Error fetching phone book entry:', error);
        return NextResponse.json(
            { error: 'Failed to fetch phone book entry' },
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
        const { email, phone, address, isPublic } = body;

        const phoneBookEntry = await prisma.phoneBookEntry.update({
            where: { id: params.id },
            data: {
                email,
                phone,
                address,
                isPublic,
            },
            include: {
                user: {
                    select: {
                        role: true,
                        status: true,
                    },
                },
            },
        });

        return NextResponse.json(phoneBookEntry);
    } catch (error) {
        console.error('Error updating phone book entry:', error);
        return NextResponse.json(
            { error: 'Failed to update phone book entry' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await prisma.phoneBookEntry.delete({ where: { id: params.id } });

        return NextResponse.json({ message: 'Phone book entry deleted successfully' });
    } catch (error) {
        console.error('Error deleting phone book entry:', error);
        return NextResponse.json(
            { error: 'Failed to delete phone book entry' },
            { status: 500 }
        );
    }
} 