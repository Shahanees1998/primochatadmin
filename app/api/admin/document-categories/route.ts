import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/admin/document-categories - List all document categories
export async function GET(request: NextRequest) {
  return withAdminAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '50');
      const search = searchParams.get('search') || '';
      const skip = (page - 1) * limit;
      
      const where: any = {};
      
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }
      
      const [categories, total] = await Promise.all([
        prisma.documentCategory.findMany({
          where,
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
            _count: {
              select: { documents: true },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.documentCategory.count({ where }),
      ]);
      
      return NextResponse.json({
        categories,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Get document categories error:', error);
      return NextResponse.json({ error: 'Failed to fetch document categories' }, { status: 500 });
    }
  });
}

// POST /api/admin/document-categories - Create a new document category
export async function POST(request: NextRequest) {
  return withAdminAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const body = await request.json();
      const { title, description } = body;

      if (!title || !title.trim()) {
        return NextResponse.json({ error: 'Title is required' }, { status: 400 });
      }

      // Check if category with same title already exists
      const existingCategory = await prisma.documentCategory.findUnique({
        where: { title: title.trim() },
      });

      if (existingCategory) {
        return NextResponse.json({ error: 'A category with this title already exists' }, { status: 400 });
      }

      const category = await prisma.documentCategory.create({
        data: {
          title: title.trim(),
          description: description?.trim() || null,
          createdBy: authenticatedReq.user!.userId,
        },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });

      return NextResponse.json(category, { status: 201 });
    } catch (error) {
      console.error('Create document category error:', error);
      return NextResponse.json({ error: 'Failed to create document category' }, { status: 500 });
    }
  });
}
