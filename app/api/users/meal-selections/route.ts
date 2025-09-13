import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      if (!authenticatedReq.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const userId = authenticatedReq.user.userId;

      // Get all meal selections for the authenticated user across all festive boards
      const mealSelections = await prisma.userMealSelection.findMany({
        where: {
          userId: userId
        },
        include: {
          festiveBoard: {
            select: {
              id: true,
              month: true,
              year: true,
              title: true,
              description: true,
              createdAt: true
            }
          },
          festiveBoardMeal: {
            include: {
              meal: {
                include: {
                  category: {
                    select: {
                      id: true,
                      name: true,
                      description: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: [
          { festiveBoard: { year: 'desc' } },
          { festiveBoard: { month: 'desc' } },
          { createdAt: 'desc' }
        ]
      });

      // Transform the data to a more user-friendly format
      const transformedSelections = mealSelections.map(selection => ({
        id: selection.id,
        isCompleted: selection.isCompleted,
        completedAt: selection.completedAt,
        selectedAt: selection.createdAt,
        festiveBoard: {
          id: selection.festiveBoard.id,
          month: selection.festiveBoard.month,
          year: selection.festiveBoard.year,
          title: selection.festiveBoard.title,
          description: selection.festiveBoard.description,
          createdAt: selection.festiveBoard.createdAt
        },
        meal: {
          id: selection.festiveBoardMeal.meal.id,
          title: selection.festiveBoardMeal.meal.title,
          description: selection.festiveBoardMeal.meal.description,
          imageUrl: selection.festiveBoardMeal.meal.imageUrl,
          category: selection.festiveBoardMeal.meal.category,
          createdAt: selection.festiveBoardMeal.meal.createdAt
        }
      }));

      // Group selections by festive board for better organization
      const groupedSelections = transformedSelections.reduce((acc, selection) => {
        const boardKey = `${selection.festiveBoard.year}-${selection.festiveBoard.month}`;
        if (!acc[boardKey]) {
          acc[boardKey] = {
            festiveBoard: selection.festiveBoard,
            meals: []
          };
        }
        acc[boardKey].meals.push({
          id: selection.id,
          meal: selection.meal,
          isCompleted: selection.isCompleted,
          completedAt: selection.completedAt,
          selectedAt: selection.selectedAt
        });
        return acc;
      }, {} as Record<string, any>);

      // Convert grouped object to array and sort by year/month descending
      const groupedArray = Object.values(groupedSelections).sort((a: any, b: any) => {
        if (a.festiveBoard.year !== b.festiveBoard.year) {
          return b.festiveBoard.year - a.festiveBoard.year;
        }
        return b.festiveBoard.month - a.festiveBoard.month;
      });

      return NextResponse.json({
        success: true,
        data: {
          totalSelections: mealSelections.length,
          groupedSelections: groupedArray,
          allSelections: transformedSelections
        },
        message: `Found ${mealSelections.length} meal selections across ${groupedArray.length} festive boards`
      });

    } catch (error) {
      console.error('Error fetching user meal selections:', error);
      return NextResponse.json(
        { 
          error: 'Internal server error',
          message: 'Failed to fetch meal selections'
        },
        { status: 500 }
      );
    }
  });
}
