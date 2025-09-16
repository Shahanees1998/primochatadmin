import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/phonebook - Get member directory (authenticated users only)
export async function GET(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '20');
      const search = searchParams.get('search') || '';
      const skip = (page - 1) * limit;
      
      const where: any = {
        isPublic: true,
        user: {
          status: 'ACTIVE',
        },
      };
      
      if (search) {
        where.OR = [
          { user: { firstName: { contains: search, mode: 'insensitive' } } },
          { user: { lastName: { contains: search, mode: 'insensitive' } } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ];
      }
      
      const [phoneBookEntries, total] = await Promise.all([
        prisma.phoneBookEntry.findMany({
          where,
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true, role: true, membershipNumber: true, profileImage: true },
            },
          },
          skip,
          take: limit,
          orderBy: { user: { firstName: 'asc' } },
        }),
        prisma.phoneBookEntry.count({ where }),
      ]);
      
      return NextResponse.json({
        phoneBookEntries,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Get phone book error:', error);
      return NextResponse.json({ error: 'Failed to fetch phone book' }, { status: 500 });
    }
  });
} 