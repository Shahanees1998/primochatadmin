import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/admin/notifications/[id] - Get specific notification
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }
    return NextResponse.json(notification);
  } catch (error) {
    console.error('Get notification error:', error);
    return NextResponse.json({ error: 'Failed to fetch notification' }, { status: 500 });
  }
}

// PUT /api/admin/notifications/[id] - Update notification
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { title, message, type, isArchived } = await request.json();
    const updateData: any = {};
    if (title) updateData.title = title;
    if (message) updateData.message = message;
    if (type) updateData.type = type;
    if (isArchived !== undefined) updateData.isArchived = isArchived;
    const notification = await prisma.notification.update({
      where: { id: params.id },
      data: updateData,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    return NextResponse.json(notification);
  } catch (error) {
    console.error('Update notification error:', error);
    const err = error as any;
    if (err && typeof err === 'object' && 'code' in err && err.code === 'P2025') {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}

// DELETE /api/admin/notifications/[id] - Delete notification
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.notification.delete({ where: { id: params.id } });
    return NextResponse.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Delete notification error:', error);
    const err = error as any;
    if (err && typeof err === 'object' && 'code' in err && err.code === 'P2025') {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 });
  }
} 