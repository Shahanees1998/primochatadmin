import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const search = searchParams.get('search') || '';
        const type = searchParams.get('type') || '';
        const isRead = searchParams.get('isRead') || '';

        const skip = (page - 1) * limit;

        // Build where clause
        const where: any = {};
        
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { message: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (type) {
            where.type = type;
        }

        if (isRead !== '') {
            where.isRead = isRead === 'true';
        }

        // Get notifications with pagination
        const [notifications, total] = await Promise.all([
            prisma.notification.findMany({
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
            prisma.notification.count({ where }),
        ]);

        return NextResponse.json({
            notifications,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return NextResponse.json(
            { error: 'Failed to fetch notifications' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, title, message, type, targetUsers } = body;

        // Validate required fields
        if (!title || !message || !type) {
            return NextResponse.json(
                { error: 'Title, message, and type are required' },
                { status: 400 }
            );
        }

        // If targetUsers is specified, create notifications for multiple users
        if (targetUsers && targetUsers.length > 0) {
            const notifications = [];
            
            for (const targetUserId of targetUsers) {
                // Check if user exists
                const existingUser = await prisma.user.findUnique({
                    where: { id: targetUserId },
                });

                if (existingUser) {
                    const notification = await prisma.notification.create({
                        data: {
                            userId: targetUserId,
                            title,
                            message,
                            type,
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
                    notifications.push(notification);
                }
            }

            return NextResponse.json(notifications, { status: 201 });
        } else {
            // Create single notification
            if (!userId) {
                return NextResponse.json(
                    { error: 'User ID is required when not using targetUsers' },
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

            const notification = await prisma.notification.create({
                data: {
                    userId,
                    title,
                    message,
                    type,
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

            return NextResponse.json(notification, { status: 201 });
        }
    } catch (error) {
        console.error('Error creating notification:', error);
        return NextResponse.json(
            { error: 'Failed to create notification' },
            { status: 500 }
        );
    }
} 