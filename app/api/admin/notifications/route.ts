import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/admin/notifications - List all notifications
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || '';
    const isArchived = searchParams.get('isArchived') || '';
    const skip = (page - 1) * limit;
    const where: any = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (type) where.type = type;
    if (isArchived !== '') where.isArchived = isArchived === 'true';
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
    ]);
    return NextResponse.json({
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

// POST /api/admin/notifications - Broadcast notification
export async function POST(request: NextRequest) {
  try {
    const { title, message, type, userIds } = await request.json();
    if (!title || !message || !type) {
      return NextResponse.json({ error: 'Title, message, and type are required' }, { status: 400 });
    }
    let notifications = [];
    if (userIds && userIds.length > 0) {
      // Send to specific users
      notifications = await Promise.all(
        userIds.map((userId: string) =>
          prisma.notification.create({
            data: {
              userId,
              title,
              message,
              type,
            },
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true, email: true },
              },
            },
          })
        )
      );
    } else {
      // Broadcast to all active members
      const users = await prisma.user.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true },
      });
      notifications = await Promise.all(
        users.map((user) =>
          prisma.notification.create({
            data: {
              userId: user.id,
              title,
              message,
              type,
            },
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true, email: true },
              },
            },
          })
        )
      );
    }
    return NextResponse.json({ notifications, count: notifications.length }, { status: 201 });
  } catch (error) {
    console.error('Broadcast notification error:', error);
    return NextResponse.json({ error: 'Failed to broadcast notification' }, { status: 500 });
  }
} 