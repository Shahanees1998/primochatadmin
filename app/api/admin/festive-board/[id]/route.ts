import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/admin/festive-board/[id] - Get specific festive board
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const festiveBoard = await prisma.festiveBoard.findUnique({
      where: { id: params.id },
      include: {
        event: true,
        items: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
      },
    });
    if (!festiveBoard) {
      return NextResponse.json({ error: 'Festive board not found' }, { status: 404 });
    }
    return NextResponse.json(festiveBoard);
  } catch (error) {
    console.error('Get festive board error:', error);
    return NextResponse.json({ error: 'Failed to fetch festive board' }, { status: 500 });
  }
}

// PUT /api/admin/festive-board/[id] - Update festive board
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { title, description, date, location, maxParticipants } = await request.json();
    const updateData: any = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (date) updateData.date = new Date(date);
    if (location !== undefined) updateData.location = location;
    if (maxParticipants !== undefined) updateData.maxParticipants = maxParticipants ? parseInt(maxParticipants) : null;
    const festiveBoard = await prisma.festiveBoard.update({
      where: { id: params.id },
      data: updateData,
      include: {
        event: true,
        items: true,
      },
    });
    return NextResponse.json(festiveBoard);
  } catch (error) {
    console.error('Update festive board error:', error);
    const err = error as any;
    if (err && typeof err === 'object' && 'code' in err && err.code === 'P2025') {
      return NextResponse.json({ error: 'Festive board not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update festive board' }, { status: 500 });
  }
}

// DELETE /api/admin/festive-board/[id] - Delete festive board
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.festiveBoard.delete({ where: { id: params.id } });
    return NextResponse.json({ message: 'Festive board deleted successfully' });
  } catch (error) {
    console.error('Delete festive board error:', error);
    const err = error as any;
    if (err && typeof err === 'object' && 'code' in err && err.code === 'P2025') {
      return NextResponse.json({ error: 'Festive board not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to delete festive board' }, { status: 500 });
  }
} 