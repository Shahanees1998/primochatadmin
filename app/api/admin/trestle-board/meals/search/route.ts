import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth, AuthenticatedRequest } from '@/lib/authMiddleware';

// GET - Search meals for trestle board
export async function GET(request: NextRequest) {
  return withAdminAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      console.log('Auth check:', { hasUser: !!authenticatedReq.user, userId: authenticatedReq.user?.userId });

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

    console.log('Meal search results:', {
      searchTerm: search,
      categoryId,
      limit,
      whereClause: where,
      mealsFound: meals.length,
      meals: meals.map(m => ({ id: m.id, title: m.title, category: m.category.name }))
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