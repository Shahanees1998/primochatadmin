import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const search = searchParams.get('search') || '';
        const type = searchParams.get('type') || '';
        const status = searchParams.get('status') || '';
        const sortField = searchParams.get('sortField') || 'createdAt';
        const sortOrder = parseInt(searchParams.get('sortOrder') || '-1');

        const skip = (page - 1) * limit;

        // Build where clause
        const where: any = {};
        
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { content: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (type) {
            where.type = type;
        }

        if (status) {
            where.status = status;
        }

        // Build orderBy clause
        const orderBy: any = {};
        orderBy[sortField] = sortOrder === 1 ? 'asc' : 'desc';

        // Get announcements with pagination
        const [announcements, total] = await Promise.all([
            prisma.announcement.findMany({
                where,
                skip,
                take: limit,
                orderBy,
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
            }),
            prisma.announcement.count({ where }),
        ]);

        return NextResponse.json({
            announcements: announcements.map(announcement => ({
                ...announcement,
                createdAt: announcement.createdAt.toISOString(),
                updatedAt: announcement.updatedAt.toISOString(),
                publishedAt: announcement.publishedAt?.toISOString(),
                expiresAt: announcement.expiresAt?.toISOString(),
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching announcements:', error);
        return NextResponse.json(
            { error: 'Failed to fetch announcements' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
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

        // Create announcement
        const announcement = await prisma.announcement.create({
            data: {
                title,
                content,
                type,
                status,
                targetAudience,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                createdById: 'admin', // TODO: Get from session
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
        }, { status: 201 });
    } catch (error) {
        console.error('Error creating announcement:', error);
        return NextResponse.json(
            { error: 'Failed to create announcement' },
            { status: 500 }
        );
    }
} 