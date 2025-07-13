import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { deleteFromCloudinary } from '@/lib/cloudinary';

// GET /api/admin/documents/[id] - Get specific document
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const document = await prisma.document.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    return NextResponse.json(document);
  } catch (error) {
    console.error('Get document error:', error);
    return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 });
  }
}

// PUT /api/admin/documents/[id] - Update document
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { title, description, category, tags, permissions } = await request.json();
    const updateData: any = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (tags) updateData.tags = tags;
    if (permissions) updateData.permissions = permissions as 'PUBLIC' | 'MEMBER_ONLY' | 'ADMIN_ONLY';
    const document = await prisma.document.update({
      where: { id: params.id },
      data: updateData,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    return NextResponse.json(document);
  } catch (error) {
    console.error('Update document error:', error);
    const err = error as any;
    if (err && typeof err === 'object' && 'code' in err && err.code === 'P2025') {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
  }
}

// DELETE /api/admin/documents/[id] - Delete document
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const document = await prisma.document.findUnique({
      where: { id: params.id },
    });
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Extract public_id from Cloudinary URL
    const urlParts = document.fileUrl.split('/');
    const publicId = urlParts[urlParts.length - 1].split('.')[0]; // Remove file extension
    
    // Delete file from Cloudinary
    try {
      await deleteFromCloudinary(publicId);
    } catch (cloudinaryError) {
      console.warn('Failed to delete file from Cloudinary:', cloudinaryError);
      // Continue with database deletion even if Cloudinary deletion fails
    }

    // Delete document record
    await prisma.document.delete({ where: { id: params.id } });
    return NextResponse.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    const err = error as any;
    if (err && typeof err === 'object' && 'code' in err && err.code === 'P2025') {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
} 