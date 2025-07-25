import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/documents - List documents for authenticated members
export async function GET(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '10');
      const search = searchParams.get('search') || '';
      const category = searchParams.get('category') || '';
      const tag = searchParams.get('tag') || '';
      const skip = (page - 1) * limit;
      
      const where: any = {
        OR: [
          { permissions: 'PUBLIC' },
          { permissions: 'MEMBER_ONLY' },
        ],
      };
      
      if (search) {
        where.AND = [{
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { fileName: { contains: search, mode: 'insensitive' } },
          ],
        }];
      }
      
      if (category) {
        where.category = category;
      }
      
      if (tag) {
        where.tags = { has: tag };
      }
      
      const [documents, total] = await Promise.all([
        prisma.document.findMany({
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
        prisma.document.count({ where }),
      ]);
      
      return NextResponse.json({
        documents,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Get documents error:', error);
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }
  });
} 