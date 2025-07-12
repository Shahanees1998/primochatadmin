import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const search = searchParams.get('search') || '';
        const isActive = searchParams.get('isActive') || '';
        const sortField = searchParams.get('sortField') || 'createdAt';
        const sortOrder = searchParams.get('sortOrder') || 'desc';

        const skip = (page - 1) * limit;

        // Build where clause
        const where: any = {};
        
        if (search) {
            where.OR = [
                { user: { firstName: { contains: search, mode: 'insensitive' } } },
                { user: { lastName: { contains: search, mode: 'insensitive' } } },
                { user: { email: { contains: search, mode: 'insensitive' } } },
            ];
        }

        if (isActive !== '') {
            where.isActive = isActive === 'true';
        }

        // Build orderBy clause
        let orderBy: any = {};
        if (sortField === 'user.firstName' || sortField === 'user.lastName' || sortField === 'user.email') {
            orderBy.user = { [sortField.split('.')[1]]: sortOrder === 'asc' ? 'asc' : 'desc' };
        } else {
            orderBy[sortField] = sortOrder === 'asc' ? 'asc' : 'desc';
        }

        // Get moderators with pagination
        const [moderators, total] = await Promise.all([
            prisma.moderator.findMany({
                where,
                skip,
                take: limit,
                orderBy,
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
            }),
            prisma.moderator.count({ where }),
        ]);

        return NextResponse.json({
            moderators,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching moderators:', error);
        return NextResponse.json(
            { error: 'Failed to fetch moderators' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, permissions, assignedAreas, isActive } = body;

        // Validate required fields
        if (!userId || !permissions || permissions.length === 0) {
            return NextResponse.json(
                { error: 'User ID and permissions are required' },
                { status: 400 }
            );
        }

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!existingUser) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Check if moderator already exists for this user
        const existingModerator = await prisma.moderator.findUnique({
            where: { userId },
        });

        if (existingModerator) {
            return NextResponse.json(
                { error: 'Moderator for this user already exists' },
                { status: 400 }
            );
        }

        // Create new moderator
        const moderator = await prisma.moderator.create({
            data: {
                userId,
                permissions,
                assignedAreas: assignedAreas || [],
                isActive: isActive !== undefined ? isActive : true,
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

        return NextResponse.json(moderator, { status: 201 });
    } catch (error) {
        console.error('Error creating moderator:', error);
        return NextResponse.json(
            { error: 'Failed to create moderator' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, permissions, assignedAreas, isActive } = body;
        if (!id) {
            return NextResponse.json({ error: 'Moderator ID is required' }, { status: 400 });
        }
        const moderator = await prisma.moderator.update({
            where: { id },
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

export async function DELETE(request: NextRequest) {
    try {
        const { id } = await request.json();
        if (!id) {
            return NextResponse.json({ error: 'Moderator ID is required' }, { status: 400 });
        }
        await prisma.moderator.delete({ where: { id } });
        return NextResponse.json({ message: 'Moderator deleted successfully' });
    } catch (error) {
        console.error('Error deleting moderator:', error);
        return NextResponse.json(
            { error: 'Failed to delete moderator' },
            { status: 500 }
        );
    }
} 