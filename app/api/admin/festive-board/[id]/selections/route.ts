import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      // Check if user is admin
      // if (authenticatedReq.user?.role !== 'ADMIN') {
      //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      // }

      // Get festive board with all meals and user selections
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
                include: {
                  user: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      email: true,
                      membershipNumber: true,
                      phone: true,
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

      // Transform data to show all selections
      const mealsWithSelections = festiveBoard.meals.map((festiveBoardMeal) => ({
        id: festiveBoardMeal.id,
        mealId: festiveBoardMeal.mealId,
        festiveBoardId: festiveBoardMeal.festiveBoardId,
        meal: festiveBoardMeal.meal,
        selections: festiveBoardMeal.userSelections,
        selectionCount: festiveBoardMeal.userSelections.length,
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
      console.error('Error fetching festive board selections:', error);
      return NextResponse.json(
        { error: 'Failed to fetch festive board selections' },
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
      // Check if user is admin
      // if (authenticatedReq.user?.role !== 'ADMIN') {
      //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      // }

      const body = await request.json();
      const { userId, mealId, action } = body; // action: 'select' or 'deselect'

      if (!userId || !mealId || !action) {
        return NextResponse.json(
          { error: 'User ID, meal ID, and action are required' },
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

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      if (action === 'select') {
        // Check if this meal is already selected by any user
        const existingMealSelection = await prisma.userMealSelection.findFirst({
          where: {
            festiveBoardMealId: festiveBoardMeal.id,
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

        if (existingMealSelection) {
          // Check if it's the same user trying to select again
          if (existingMealSelection.userId === userId) {
            return NextResponse.json(
              { error: 'You have already selected this meal' },
              { status: 400 }
            );
          } else {
            // Another user has already selected this meal
            return NextResponse.json(
              { 
                error: 'This meal is already selected by another user',
                selectedBy: {
                  userId: existingMealSelection.user.id,
                  name: `${existingMealSelection.user.firstName} ${existingMealSelection.user.lastName}`,
                  email: existingMealSelection.user.email,
                  membershipNumber: existingMealSelection.user.membershipNumber
                }
              },
              { status: 409 }
            );
          }
        }

        // Create selection
        const selection = await prisma.userMealSelection.create({
          data: {
            userId: userId,
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
        // Check if this user has selected this meal
        const existingSelection = await prisma.userMealSelection.findFirst({
          where: {
            userId: userId,
            festiveBoardMealId: festiveBoardMeal.id,
          },
        });

        if (!existingSelection) {
          return NextResponse.json(
            { error: 'You have not selected this meal' },
            { status: 400 }
          );
        }

        // Remove selection
        const deletedSelection = await prisma.userMealSelection.deleteMany({
          where: {
            userId: userId,
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