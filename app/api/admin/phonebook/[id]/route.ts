import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/admin/phonebook/[id] - Get specific phone book entry
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const phoneBookEntry = await prisma.phoneBookEntry.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true, status: true },
        },
      },
    });
    if (!phoneBookEntry) {
      return NextResponse.json({ error: 'Phone book entry not found' }, { status: 404 });
    }
    return NextResponse.json(phoneBookEntry);
  } catch (error) {
    console.error('Get phone book entry error:', error);
    return NextResponse.json({ error: 'Failed to fetch phone book entry' }, { status: 500 });
  }
}

// PUT /api/admin/phonebook/[id] - Update phone book entry
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { email, phone, address, isPublic } = await request.json();
    const updateData: any = {};
    if (email) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    const phoneBookEntry = await prisma.phoneBookEntry.update({
      where: { id: params.id },
      data: updateData,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    return NextResponse.json(phoneBookEntry);
  } catch (error) {
    console.error('Update phone book entry error:', error);
    const err = error as any;
    if (err && typeof err === 'object' && 'code' in err && err.code === 'P2025') {
      return NextResponse.json({ error: 'Phone book entry not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update phone book entry' }, { status: 500 });
  }
}

// DELETE /api/admin/phonebook/[id] - Delete phone book entry
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.phoneBookEntry.delete({ where: { id: params.id } });
    return NextResponse.json({ message: 'Phone book entry deleted successfully' });
  } catch (error) {
    console.error('Delete phone book entry error:', error);
    const err = error as any;
    if (err && typeof err === 'object' && 'code' in err && err.code === 'P2025') {
      return NextResponse.json({ error: 'Phone book entry not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to delete phone book entry' }, { status: 500 });
  }
} 