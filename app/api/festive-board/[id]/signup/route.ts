import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/festive-board/[id]/signup - Sign up for festive board item
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId, category, name, description } = await request.json();
    if (!userId || !category || !name) {
      return NextResponse.json({ error: 'User ID, category, and name are required' }, { status: 400 });
    }
    // Check if festive board exists
    const festiveBoard = await prisma.festiveBoard.findUnique({
      where: { id: params.id },
    });
    if (!festiveBoard) {
      return NextResponse.json({ error: 'Festive board not found' }, { status: 404 });
    }
    // Check if item is already assigned
    const existingItem = await prisma.festiveBoardItem.findFirst({
      where: {
        festiveBoardId: params.id,
        category,
        name,
        isAssigned: true,
      },
    });
    if (existingItem) {
      return NextResponse.json({ error: 'This item is already assigned to someone else' }, { status: 409 });
    }
    // Create festive board item
    const festiveBoardItem = await prisma.festiveBoardItem.create({
      data: {
        festiveBoardId: params.id,
        userId,
        category,
        name,
        description,
        isAssigned: true,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
    return NextResponse.json(festiveBoardItem, { status: 201 });
  } catch (error) {
    console.error('Festive board signup error:', error);
    return NextResponse.json({ error: 'Failed to sign up for festive board item' }, { status: 500 });
  }
}

// DELETE /api/festive-board/[id]/signup - Cancel festive board signup
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const itemId = searchParams.get('itemId');
    if (!userId || !itemId) {
      return NextResponse.json({ error: 'User ID and item ID are required' }, { status: 400 });
    }
    // Check if user owns the item
    const item = await prisma.festiveBoardItem.findFirst({
      where: {
        id: itemId,
        userId,
        festiveBoardId: params.id,
      },
    });
    if (!item) {
      return NextResponse.json({ error: 'Item not found or not owned by user' }, { status: 404 });
    }
    await prisma.festiveBoardItem.delete({
      where: { id: itemId },
    });
    return NextResponse.json({ message: 'Festive board signup cancelled successfully' });
  } catch (error) {
    console.error('Cancel festive board signup error:', error);
    const err = error as any;
    if (err && typeof err === 'object' && 'code' in err && err.code === 'P2025') {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to cancel festive board signup' }, { status: 500 });
  }
} 