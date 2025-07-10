import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/admin/support/[id] - Get specific support request
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supportRequest = await prisma.supportRequest.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    if (!supportRequest) {
      return NextResponse.json({ error: 'Support request not found' }, { status: 404 });
    }
    return NextResponse.json(supportRequest);
  } catch (error) {
    console.error('Get support request error:', error);
    return NextResponse.json({ error: 'Failed to fetch support request' }, { status: 500 });
  }
}

// PUT /api/admin/support/[id] - Update support request (respond)
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { status, priority, adminResponse } = await request.json();
    const updateData: any = {};
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (adminResponse) updateData.adminResponse = adminResponse;
    const supportRequest = await prisma.supportRequest.update({
      where: { id: params.id },
      data: updateData,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    return NextResponse.json(supportRequest);
  } catch (error) {
    console.error('Update support request error:', error);
    const err = error as any;
    if (err && typeof err === 'object' && 'code' in err && err.code === 'P2025') {
      return NextResponse.json({ error: 'Support request not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update support request' }, { status: 500 });
  }
}

// DELETE /api/admin/support/[id] - Delete support request
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.supportRequest.delete({ where: { id: params.id } });
    return NextResponse.json({ message: 'Support request deleted successfully' });
  } catch (error) {
    console.error('Delete support request error:', error);
    const err = error as any;
    if (err && typeof err === 'object' && 'code' in err && err.code === 'P2025') {
      return NextResponse.json({ error: 'Support request not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to delete support request' }, { status: 500 });
  }
} 