import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth, AuthenticatedRequest } from '@/lib/authMiddleware';

// GET - Get a specific Festive board
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAdminAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {

    const board = await prisma.festiveBoard.findUnique({
      where: { id: params.id },
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
    });

    if (!board) {
      return NextResponse.json(
        { error: 'Festive board not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: board });
      } catch (error) {
      console.error('Error fetching Festive board:', error);
      return NextResponse.json(
        { error: 'Failed to fetch Festive board' },
        { status: 500 }
      );
    }
  });
}

// PUT - Update a Festive board
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAdminAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {

    const body = await request.json();
    const { title, mainCourse, description, mealIds } = body;

    // Validate required fields
    if (!title || !mealIds || !Array.isArray(mealIds)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if board exists
    const existingBoard = await prisma.festiveBoard.findUnique({
      where: { id: params.id },
    });

    if (!existingBoard) {
      return NextResponse.json(
        { error: 'Festive board not found' },
        { status: 404 }
      );
    }

    // Validate that all meals exist
    const meals = await prisma.meal.findMany({
      where: {
        id: { in: mealIds },
      },
    });

    if (meals.length !== mealIds.length) {
      return NextResponse.json(
        { error: 'Some meals not found' },
        { status: 400 }
      );
    }

    // Update the Festive board
    const board = await prisma.festiveBoard.update({
      where: { id: params.id },
      data: {
        title,
        mainCourse,
        description,
        meals: {
          deleteMany: {},
          create: mealIds.map((mealId: string) => ({
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
      message: 'Festive board updated successfully',
    });
      } catch (error) {
      console.error('Error updating Festive board:', error);
      return NextResponse.json(
        { error: 'Failed to update Festive board' },
        { status: 500 }
      );
    }
  });
}

// DELETE - Delete a Festive board
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAdminAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {

    // Check if board exists
    const existingBoard = await prisma.festiveBoard.findUnique({
      where: { id: params.id },
    });

    if (!existingBoard) {
      return NextResponse.json(
        { error: 'Festive board not found' },
        { status: 404 }
      );
    }

    // Delete the Festive board (cascade will handle related records)
    await prisma.festiveBoard.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      message: 'Festive board deleted successfully',
    });
      } catch (error) {
      console.error('Error deleting Festive board:', error);
      return NextResponse.json(
        { error: 'Failed to delete Festive board' },
        { status: 500 }
      );
    }
  });
} 