import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      if (!authenticatedReq.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Get festive board with meals and user selections
      const festiveBoard = await prisma.festiveBoard.findUnique({
        where: { id: params.id },
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
                  userId: authenticatedReq.user.userId,
                },
                include: {
                  user: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      email: true,
                      membershipNumber: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!festiveBoard) {
        return NextResponse.json(
          { error: 'Festive board not found' },
          { status: 404 }
        );
      }

      // Transform data to include selection status for current user
      const mealsWithSelections = festiveBoard.meals.map((festiveBoardMeal) => ({
        id: festiveBoardMeal.id,
        mealId: festiveBoardMeal.mealId,
        festiveBoardId: festiveBoardMeal.festiveBoardId,
        meal: festiveBoardMeal.meal,
        isSelected: festiveBoardMeal.userSelections.length > 0,
        selectedAt: festiveBoardMeal.userSelections[0]?.createdAt || null,
      }));

      return NextResponse.json({
        festiveBoard: {
          id: festiveBoard.id,
          title: festiveBoard.title,
          description: festiveBoard.description,
          month: festiveBoard.month,
          year: festiveBoard.year,
        },
        meals: mealsWithSelections,
      });
    } catch (error) {
      console.error('Error fetching festive board meals:', error);
      return NextResponse.json(
        { error: 'Failed to fetch festive board meals' },
        { status: 500 }
      );
    }
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      if (!authenticatedReq.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const body = await request.json();
      const { mealId, action } = body; // action: 'select' or 'deselect'

      if (!mealId || !action) {
        return NextResponse.json(
          { error: 'Meal ID and action are required' },
          { status: 400 }
        );
      }

      // Check if festive board exists
      const festiveBoard = await prisma.festiveBoard.findUnique({
        where: { id: params.id },
      });

      if (!festiveBoard) {
        return NextResponse.json(
          { error: 'Festive board not found' },
          { status: 404 }
        );
      }

      // Check if meal exists in this festive board
      const festiveBoardMeal = await prisma.festiveBoardMeal.findFirst({
        where: {
          festiveBoardId: params.id,
          mealId: mealId,
        },
      });

      if (!festiveBoardMeal) {
        return NextResponse.json(
          { error: 'Meal not found in this festive board' },
          { status: 404 }
        );
      }

      if (action === 'select') {
        // Check if already selected
        const existingSelection = await prisma.userMealSelection.findFirst({
          where: {
            userId: authenticatedReq.user.userId,
            festiveBoardMealId: festiveBoardMeal.id,
          },
        });

        if (existingSelection) {
          return NextResponse.json(
            { error: 'Meal already selected' },
            { status: 400 }
          );
        }

        // Create selection
        const selection = await prisma.userMealSelection.create({
          data: {
            userId: authenticatedReq.user.userId,
            festiveBoardMealId: festiveBoardMeal.id,
            festiveBoardId: params.id,
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                membershipNumber: true,
              },
            },
          },
        });

        return NextResponse.json(selection, { status: 201 });
      } else if (action === 'deselect') {
        // Remove selection
        const deletedSelection = await prisma.userMealSelection.deleteMany({
          where: {
            userId: authenticatedReq.user.userId,
            festiveBoardMealId: festiveBoardMeal.id,
          },
        });

        return NextResponse.json({ message: 'Meal deselected successfully' });
      } else {
        return NextResponse.json(
          { error: 'Invalid action. Use "select" or "deselect"' },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error('Error managing meal selection:', error);
      return NextResponse.json(
        { error: 'Failed to manage meal selection' },
        { status: 500 }
      );
    }
  });
} 