import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/admin/document-categories/[id] - Get a specific document category
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAdminAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const category = await prisma.documentCategory.findUnique({
        where: { id: params.id },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          _count: {
            select: { documents: true },
          },
        },
      });

      if (!category) {
        return NextResponse.json({ error: 'Document category not found' }, { status: 404 });
      }

      return NextResponse.json(category);
    } catch (error) {
      console.error('Get document category error:', error);
      return NextResponse.json({ error: 'Failed to fetch document category' }, { status: 500 });
    }
  });
}

// PUT /api/admin/document-categories/[id] - Update a document category
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAdminAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const body = await request.json();
      const { title, description } = body;

      if (!title || !title.trim()) {
        return NextResponse.json({ error: 'Title is required' }, { status: 400 });
      }

      // Check if category exists
      const existingCategory = await prisma.documentCategory.findUnique({
        where: { id: params.id },
      });

      if (!existingCategory) {
        return NextResponse.json({ error: 'Document category not found' }, { status: 404 });
      }

      // Check if another category with same title already exists
      const duplicateCategory = await prisma.documentCategory.findFirst({
        where: {
          title: title.trim(),
          id: { not: params.id },
        },
      });

      if (duplicateCategory) {
        return NextResponse.json({ error: 'A category with this title already exists' }, { status: 400 });
      }

      const category = await prisma.documentCategory.update({
        where: { id: params.id },
        data: {
          title: title.trim(),
          description: description?.trim() || null,
        },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });

      return NextResponse.json(category);
    } catch (error) {
      console.error('Update document category error:', error);
      return NextResponse.json({ error: 'Failed to update document category' }, { status: 500 });
    }
  });
}

// DELETE /api/admin/document-categories/[id] - Delete a document category
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAdminAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      // Check if category exists and has documents
      const category = await prisma.documentCategory.findUnique({
        where: { id: params.id },
        include: {
          _count: {
            select: { documents: true },
          },
        },
      });

      if (!category) {
        return NextResponse.json({ error: 'Document category not found' }, { status: 404 });
      }

      if (category._count.documents > 0) {
        return NextResponse.json({ 
          error: 'Cannot delete category that has documents. Please reassign or delete the documents first.' 
        }, { status: 400 });
      }

      await prisma.documentCategory.delete({
        where: { id: params.id },
      });

      return NextResponse.json({ message: 'Document category deleted successfully' });
    } catch (error) {
      console.error('Delete document category error:', error);
      return NextResponse.json({ error: 'Failed to delete document category' }, { status: 500 });
    }
  });
}
