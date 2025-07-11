import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const search = searchParams.get('search') || '';
        const boardId = searchParams.get('boardId') || '';
        const category = searchParams.get('category') || '';
        const isAssigned = searchParams.get('isAssigned');
        const sortField = searchParams.get('sortField') || 'createdAt';
        const sortOrder = searchParams.get('sortOrder') || '-1';

        const skip = (page - 1) * limit;

        // Build where clause
        const where: any = {};
        
        if (boardId) {
            where.festiveBoardId = boardId;
        }
        
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (category) {
            where.category = category;
        }

        if (isAssigned !== null && isAssigned !== undefined) {
            where.isAssigned = isAssigned === 'true';
        }

        // Build orderBy clause
        const orderBy: any = {};
        if (sortField === 'user.firstName') {
            orderBy.user = { firstName: sortOrder === '1' ? 'asc' : 'desc' };
        } else {
            orderBy[sortField] = sortOrder === '1' ? 'asc' : 'desc';
        }

        // Get items with pagination
        const [items, total] = await Promise.all([
            prisma.festiveBoardItem.findMany({
                where,
                skip,
                take: limit,
                orderBy,
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                    festiveBoard: {
                        select: {
                            id: true,
                            title: true,
                            date: true,
                        },
                    },
                },
            }),
            prisma.festiveBoardItem.count({ where }),
        ]);

        return NextResponse.json({
            items,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching festive board items:', error);
        return NextResponse.json(
            { error: 'Failed to fetch festive board items' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { festiveBoardId, userId, category, name, description } = body;

        // Validate required fields
        if (!festiveBoardId || !userId || !category || !name) {
            return NextResponse.json(
                { error: 'Festive board ID, user ID, category, and name are required' },
                { status: 400 }
            );
        }

        // Check if festive board exists
        const existingBoard = await prisma.festiveBoard.findUnique({
            where: { id: festiveBoardId },
        });

        if (!existingBoard) {
            return NextResponse.json(
                { error: 'Festive board not found' },
                { status: 404 }
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

        // Create new item
        const item = await prisma.festiveBoardItem.create({
            data: {
                festiveBoardId,
                userId,
                category,
                name,
                description,
                isAssigned: false,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                festiveBoard: {
                    select: {
                        id: true,
                        title: true,
                        date: true,
                    },
                },
            },
        });

        return NextResponse.json(item, { status: 201 });
    } catch (error) {
        console.error('Error creating festive board item:', error);
        return NextResponse.json(
            { error: 'Failed to create festive board item' },
            { status: 500 }
        );
    }
} 