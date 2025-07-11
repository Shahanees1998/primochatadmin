import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const search = searchParams.get('search') || '';
        const status = searchParams.get('status') || '';
        const priority = searchParams.get('priority') || '';

        const skip = (page - 1) * limit;

        // Build where clause
        const where: any = {};
        
        if (search) {
            where.OR = [
                { subject: { contains: search, mode: 'insensitive' } },
                { message: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (status) {
            where.status = status;
        }

        if (priority) {
            where.priority = priority;
        }

        // Get support requests with pagination
        const [supportRequests, total] = await Promise.all([
            prisma.supportRequest.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                },
            }),
            prisma.supportRequest.count({ where }),
        ]);

        return NextResponse.json({
            supportRequests,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching support requests:', error);
        return NextResponse.json(
            { error: 'Failed to fetch support requests' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, subject, message, status, priority, adminResponse } = body;

        // Validate required fields
        if (!userId || !subject || !message) {
            return NextResponse.json(
                { error: 'User ID, subject, and message are required' },
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

        // Create new support request
        const supportRequest = await prisma.supportRequest.create({
            data: {
                userId,
                subject,
                message,
                status: status || 'OPEN',
                priority: priority || 'MEDIUM',
                adminResponse,
            },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });

        return NextResponse.json(supportRequest, { status: 201 });
    } catch (error) {
        console.error('Error creating support request:', error);
        return NextResponse.json(
            { error: 'Failed to create support request' },
            { status: 500 }
        );
    }
} 