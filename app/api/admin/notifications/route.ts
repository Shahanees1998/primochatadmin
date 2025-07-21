import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
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

            // Build where clause - ALWAYS filter by the authenticated user's ID
            const where: any = { 
                userId: authenticatedReq.user!.userId 
            };
            
            if (search) {
                where.OR = [
                    { title: { contains: search, mode: 'insensitive' } },
                    { message: { contains: search, mode: 'insensitive' } },
                ];
            }

            if (type) {
                where.type = type;
            }

            if (status) {
                switch (status) {
                    case 'unread':
                        where.isRead = false;
                        break;
                    case 'read':
                        where.isRead = true;
                        break;
                    case 'archived':
                        where.isArchived = true;
                        break;
                }
            }

            // Build orderBy clause
            const orderBy: any = {};
            orderBy[sortField] = sortOrder === 1 ? 'asc' : 'desc';

            // Get notifications with pagination
            const [notifications, total] = await Promise.all([
                prisma.notification.findMany({
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
                    },
                }),
                prisma.notification.count({ where }),
            ]);

            return NextResponse.json({
                notifications: notifications.map(notification => ({
                    ...notification,
                    createdAt: notification.createdAt.toISOString(),
                })),
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
    });
}

export async function PATCH(request: NextRequest) {
    return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
        try {
            const { searchParams } = new URL(request.url);
            const action = searchParams.get('action');

            if (action === 'mark-all-read') {
                // Only mark notifications as read for the authenticated user
                await prisma.notification.updateMany({
                    where: { 
                        userId: authenticatedReq.user!.userId,
                        isRead: false 
                    },
                    data: { isRead: true },
                });

                return NextResponse.json({ message: 'All notifications marked as read' });
            }

            return NextResponse.json(
                { error: 'Invalid action' },
                { status: 400 }
            );
        } catch (error) {
            console.error('Error updating notifications:', error);
            return NextResponse.json(
                { error: 'Failed to update notifications' },
                { status: 500 }
            );
        }
    });
} 