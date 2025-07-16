import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';

// GET - List trestle boards for users
export async function GET(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {

    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    // Build where clause
    const where: any = {};
    if (year) {
      where.year = parseInt(year);
    }
    if (month) {
      where.month = parseInt(month);
    }

    const boards = await prisma.trestleBoard.findMany({
      where,
      include: {
        meals: {
          include: {
            meal: {
              include: {
                category: true,
              },
            },
            userSelections: {
              where: {
                userId: authenticatedReq.user!.userId,
              },
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
        userSelections: {
          where: {
            userId: authenticatedReq.user!.userId,
          },
          include: {
            trestleBoardMeal: {
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
    });

    return NextResponse.json({
      data: boards,
    });
      } catch (error) {
      console.error('Error fetching trestle boards:', error);
      return NextResponse.json(
        { error: 'Failed to fetch trestle boards' },
        { status: 500 }
      );
    }
  });
}

// POST - Mark meal as completed by user
export async function POST(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {

    const body = await request.json();
    const { trestleBoardMealId, isCompleted } = body;

    if (!trestleBoardMealId || typeof isCompleted !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if the trestle board meal exists
    const trestleBoardMeal = await prisma.trestleBoardMeal.findUnique({
      where: { id: trestleBoardMealId },
      include: {
        trestleBoard: true,
      },
    });

    if (!trestleBoardMeal) {
      return NextResponse.json(
        { error: 'Trestle board meal not found' },
        { status: 404 }
      );
    }

    // Upsert the user meal selection
    const userSelection = await prisma.userMealSelection.upsert({
      where: {
        userId_trestleBoardMealId: {
          userId: authenticatedReq.user!.userId,
          trestleBoardMealId,
        },
      },
      update: {
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
      },
      create: {
        userId: authenticatedReq.user!.userId,
        trestleBoardId: trestleBoardMeal.trestleBoardId,
        trestleBoardMealId,
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        trestleBoardMeal: {
          include: {
            meal: true,
          },
        },
      },
    });

    return NextResponse.json({
      data: userSelection,
      message: isCompleted ? 'Meal marked as completed' : 'Meal marked as incomplete',
    });
  } catch (error) {
    console.error('Error updating meal selection:', error);
    return NextResponse.json(
      { error: 'Failed to update meal selection' },
      { status: 500 }
    );
  }
  });
} 