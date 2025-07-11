import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/admin/festive-board/items/[id] - Get specific item
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const item = await prisma.festiveBoardItem.findUnique({
            where: { id: params.id },
            include: {
                user: {
                    select: { id: true, firstName: true, lastName: true, email: true },
                },
                festiveBoard: {
                    select: { id: true, title: true, date: true },
                },
            },
        });
        
        if (!item) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        }
        
        return NextResponse.json(item);
    } catch (error) {
        console.error('Get festive board item error:', error);
        return NextResponse.json({ error: 'Failed to fetch item' }, { status: 500 });
    }
}

// PUT /api/admin/festive-board/items/[id] - Update item
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { category, name, description, isAssigned } = await request.json();
        const updateData: any = {};
        
        if (category) updateData.category = category;
        if (name) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (isAssigned !== undefined) updateData.isAssigned = isAssigned;
        
        const item = await prisma.festiveBoardItem.update({
            where: { id: params.id },
            data: updateData,
            include: {
                user: {
                    select: { id: true, firstName: true, lastName: true, email: true },
                },
                festiveBoard: {
                    select: { id: true, title: true, date: true },
                },
            },
        });
        
        return NextResponse.json(item);
    } catch (error) {
        console.error('Update festive board item error:', error);
        const err = error as any;
        if (err && typeof err === 'object' && 'code' in err && err.code === 'P2025') {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
    }
}

// DELETE /api/admin/festive-board/items/[id] - Delete item
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        await prisma.festiveBoardItem.delete({ where: { id: params.id } });
        return NextResponse.json({ message: 'Item deleted successfully' });
    } catch (error) {
        console.error('Delete festive board item error:', error);
        const err = error as any;
        if (err && typeof err === 'object' && 'code' in err && err.code === 'P2025') {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
    }
} 