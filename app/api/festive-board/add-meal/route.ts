import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      if (!authenticatedReq.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const userId = authenticatedReq.user.userId;
      const body = await request.json();
      
      const {
        festiveBoardId,
        title,
        description,
        categoryId,
        imageUrl
      } = body;

      // Validate required fields
      if (!festiveBoardId || !title || !categoryId) {
        return NextResponse.json(
          { error: 'Missing required fields: festiveBoardId, title, categoryId' },
          { status: 400 }
        );
      }

      // Verify festive board exists
      const festiveBoard = await prisma.festiveBoard.findUnique({
        where: { id: festiveBoardId }
      });

      if (!festiveBoard) {
        return NextResponse.json(
          { error: 'Festive board not found' },
          { status: 404 }
        );
      }

      // Verify meal category exists
      const mealCategory = await prisma.mealCategory.findUnique({
        where: { id: categoryId }
      });

      if (!mealCategory) {
        return NextResponse.json(
          { error: 'Meal category not found' },
          { status: 404 }
        );
      }

      // Create new meal
      const newMeal = await prisma.meal.create({
        data: {
          title: title.trim(),
          description: description?.trim() || null,
          categoryId: categoryId,
          imageUrl: imageUrl || null
        },
        include: {
          category: true
        }
      });

      // Add meal to festive board
      const festiveBoardMeal = await prisma.festiveBoardMeal.create({
        data: {
          festiveBoardId: festiveBoardId,
          mealId: newMeal.id
        }
      });

      // Create meal selection for the user
      const mealSelection = await prisma.userMealSelection.create({
        data: {
          userId: userId,
          festiveBoardId: festiveBoardId,
          festiveBoardMealId: festiveBoardMeal.id
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              membershipNumber: true
            }
          },
          festiveBoardMeal: {
            include: {
              meal: {
                include: {
                  category: true
                }
              }
            }
          }
        }
      });

      // Return the created meal with selection info
      const result = {
        meal: newMeal,
        festiveBoardMeal: festiveBoardMeal,
        mealSelection: mealSelection,
        message: 'Meal created, added to festive board, and selected successfully'
      };

      return NextResponse.json(result, { status: 201 });

    } catch (error) {
      console.error('Error in add-meal API:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

export async function GET(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      if (!authenticatedReq.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const userId = authenticatedReq.user.userId;
      const { searchParams } = new URL(request.url);
      const festiveBoardId = searchParams.get('festiveBoardId');

      if (!festiveBoardId) {
        return NextResponse.json(
          { error: 'festiveBoardId is required' },
          { status: 400 }
        );
      }

      // Get user's meal selections for the specific festive board
      const mealSelections = await prisma.userMealSelection.findMany({
        where: {
          userId: userId,
          festiveBoardId: festiveBoardId
        },
        include: {
          festiveBoardMeal: {
            include: {
              meal: {
                include: {
                  category: true
                }
              }
            }
          },
          festiveBoard: {
            select: {
              id: true,
              title: true,
              description: true,
              month: true,
              year: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return NextResponse.json({
        mealSelections,
        count: mealSelections.length
      });

    } catch (error) {
      console.error('Error in add-meal GET API:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
