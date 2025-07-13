import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '../../auth/authOptions';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        
        // Debug: Log all search parameters        
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
               if (type && type.trim()) {
            where.type = type;
        }

        if (status && status.trim()) {
            where.status = status;
        }
        // Build orderBy clause
        const orderBy: any = {};
        orderBy[sortField] = sortOrder === 1 ? 'asc' : 'desc';        
        let announcements, total;
        try {
            [announcements, total] = await Promise.all([
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
        } catch (prismaError) {
            console.error('Announcements API - Prisma query failed:', prismaError);
            throw prismaError;
        }

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
        const session = await getServerSession(authOptions);
        
        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

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
                createdById: session.user.id,
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