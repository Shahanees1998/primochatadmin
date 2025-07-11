import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const search = searchParams.get('search') || '';
        const sortField = searchParams.get('sortField') || 'createdAt';
        const sortOrder = searchParams.get('sortOrder') || '-1';

        const skip = (page - 1) * limit;

        // Build where clause
        const where: any = {};
        
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { location: { contains: search, mode: 'insensitive' } },
            ];
        }

        // Build orderBy clause
        const orderBy: any = {};
        if (sortField === 'event.title') {
            orderBy.event = { title: sortOrder === '1' ? 'asc' : 'desc' };
        } else {
            orderBy[sortField] = sortOrder === '1' ? 'asc' : 'desc';
        }

        // Get festive boards with pagination
        const [festiveBoards, total] = await Promise.all([
            prisma.festiveBoard.findMany({
                where,
                skip,
                take: limit,
                orderBy,
                include: {
                    event: {
                        select: {
                            title: true,
                            startDate: true,
                        },
                    },
                    items: {
                        include: {
                            user: {
                                select: {
                                    firstName: true,
                                    lastName: true,
                                },
                            },
                        },
                    },
                },
            }),
            prisma.festiveBoard.count({ where }),
        ]);

        return NextResponse.json({
            festiveBoards,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching festive boards:', error);
        return NextResponse.json(
            { error: 'Failed to fetch festive boards' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { eventId, title, description, date, location, maxParticipants } = body;

        // Validate required fields
        if (!eventId || !title || !date) {
            return NextResponse.json(
                { error: 'Event ID, title, and date are required' },
                { status: 400 }
            );
        }

        // Check if event exists
        const existingEvent = await prisma.event.findUnique({
            where: { id: eventId },
        });

        if (!existingEvent) {
            return NextResponse.json(
                { error: 'Event not found' },
                { status: 404 }
            );
        }

        // Check if festive board already exists for this event
        const existingBoard = await prisma.festiveBoard.findUnique({
            where: { eventId },
        });

        if (existingBoard) {
            return NextResponse.json(
                { error: 'Festive board already exists for this event' },
                { status: 400 }
            );
        }

        // Create new festive board
        const festiveBoard = await prisma.festiveBoard.create({
            data: {
                eventId,
                title,
                description,
                date: new Date(date),
                location,
                maxParticipants: maxParticipants || null,
            },
            include: {
                event: {
                    select: {
                        title: true,
                        startDate: true,
                    },
                },
            },
        });

        return NextResponse.json(festiveBoard, { status: 201 });
    } catch (error) {
        console.error('Error creating festive board:', error);
        return NextResponse.json(
            { error: 'Failed to create festive board' },
            { status: 500 }
        );
    }
} 