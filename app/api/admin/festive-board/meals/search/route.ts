import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth, AuthenticatedRequest } from '@/lib/authMiddleware';

// GET - Search meals for Festive board
export async function GET(request: NextRequest) {
  return withAdminAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const categoryId = searchParams.get('categoryId');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build where clause
    const where: any = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (categoryId) {
      where.categoryId = categoryId;
    }

    const meals = await prisma.meal.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: [
        { title: 'asc' },
      ],
      take: limit,
    });
    return NextResponse.json({
      data: meals,
    });
      } catch (error) {
      console.error('Error searching meals:', error);
      return NextResponse.json(
        { error: 'Failed to search meals' },
        { status: 500 }
      );
    }
  });
} 