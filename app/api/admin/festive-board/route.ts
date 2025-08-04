import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth, AuthenticatedRequest } from '@/lib/authMiddleware';

// GET - List all festive boards
export async function GET(request: NextRequest) {
  return withAdminAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '10');
      const search = searchParams.get('search') || '';
      const year = searchParams.get('year');

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }
      if (year && year !== 'null') {
        where.year = parseInt(year);
      }

      const [boards, total] = await Promise.all([
        prisma.festiveBoard.findMany({
          where,
          include: {
            createdBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            meals: {
              include: {
                meal: {
                  include: {
                    category: true,
                  },
                },
              },
            },
            userSelections: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                  },
                },
                festiveBoardMeal: {
                  include: {
                    meal: true,
                  },
                },
              },
            },
          },
          orderBy: [
            { year: 'desc' },
            { month: 'desc' },
          ],
          skip,
          take: limit,
        }),
        prisma.festiveBoard.count({ where }),
      ]);

      return NextResponse.json({
        data: {
          boards,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      console.error('Error fetching Festive boards:', error);
      return NextResponse.json(
        { error: 'Failed to fetch Festive boards' },
        { status: 500 }
      );
    }
  });
}

// POST - Create a new Festive board
export async function POST(request: NextRequest) {
  return withAdminAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const body = await request.json();
      const { month, year, title, description, mealIds } = body;

      // Validate required fields
      if (!month || !year || !title || !mealIds || !Array.isArray(mealIds)) {
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        );
      }

      // Filter out null/undefined values and validate mealIds
      const validMealIds = mealIds.filter((id: any) => id && typeof id === 'string' && id.trim() !== '');

      if (validMealIds.length === 0) {
        return NextResponse.json(
          { error: 'At least one valid meal must be selected' },
          { status: 400 }
        );
      }
      // Check if board already exists for this month/year
      const existingBoard = await prisma.festiveBoard.findUnique({
        where: {
          month_year: {
            month: parseInt(month),
            year: parseInt(year),
          },
        },
      });

      if (existingBoard) {
        return NextResponse.json(
          { error: 'A Festive board already exists for this month and year' },
          { status: 400 }
        );
      }

      // Validate that all meals exist
      const meals = await prisma.meal.findMany({
        where: {
          id: { in: validMealIds },
        },
      });

      if (meals.length !== validMealIds.length) {
        return NextResponse.json(
          { error: 'Some meals not found' },
          { status: 400 }
        );
      }

      // Create the Festive board with meals
      const board = await prisma.festiveBoard.create({
        data: {
          month: parseInt(month),
          year: parseInt(year),
          title,
          description,
          createdById: authenticatedReq.user!.userId,
          meals: {
            create: validMealIds.map((mealId: string) => ({
              mealId,
            })),
          },
        },
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          meals: {
            include: {
              meal: {
                include: {
                  category: true,
                },
              },
            },
          },
        },
      });

      return NextResponse.json({
        data: board,
        message: 'Festive board created successfully',
      });
    } catch (error) {
      console.error('Error creating Festive board:', error);
      return NextResponse.json(
        { error: 'Failed to create Festive board' },
        { status: 500 }
      );
    }
  });
} 