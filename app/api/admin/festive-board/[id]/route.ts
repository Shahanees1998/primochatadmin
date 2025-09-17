import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { LCMService } from '@/lib/lcmService';
import { NotificationService } from '@/lib/notificationService';
import { NotificationType } from '@prisma/client';

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

    // Check if board exists and get current meals
    const existingBoard = await prisma.festiveBoard.findUnique({
      where: { id: params.id },
      include: {
        meals: {
          include: {
            meal: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!existingBoard) {
      return NextResponse.json(
        { error: 'Festive board not found' },
        { status: 404 }
      );
    }

    // Track meal changes for notifications
    const currentMealIds = existingBoard.meals.map(fbm => fbm.mealId);
    const newMealIds = mealIds.filter((id: string) => id && typeof id === 'string' && id.trim() !== '');
    const addedMealIds = newMealIds.filter(id => !currentMealIds.includes(id));
    const removedMealIds = currentMealIds.filter(id => !newMealIds.includes(id));

    // Get details of added and removed meals for notifications
    const addedMeals = addedMealIds.length > 0 ? await prisma.meal.findMany({
      where: { id: { in: addedMealIds } },
      select: { id: true, title: true },
    }) : [];

    const removedMeals = removedMealIds.length > 0 ? await prisma.meal.findMany({
      where: { id: { in: removedMealIds } },
      select: { id: true, title: true },
    }) : [];

    // Validate that all meals exist
    const meals = await prisma.meal.findMany({
      where: {
        id: { in: newMealIds },
      },
    });

    if (meals.length !== newMealIds.length) {
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
          create: newMealIds.map((mealId: string) => ({
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

    // Send FCM notifications and create database notification records for festive board update and meal changes
    try {
      // Get all users for notification records
      const allUsers = await prisma.user.findMany({
        where: { isDeleted: false },
        select: { id: true },
      });

      // 1. Send notification for festive board update to all users
      await LCMService.sendToAllUsers({
        title: 'Festive Board Updated',
        body: `The festive board "${board.title}" has been updated by admin`,
        data: {
          type: 'festive_board_update',
          festiveBoardId: board.id,
          action: 'updated',
          title: board.title,
          month: board.month.toString(),
          year: board.year.toString(),
          updatedBy: authenticatedReq.user!.firstName + ' ' + authenticatedReq.user!.lastName,
          updatedByUserId: authenticatedReq.user!.userId,
        },
        priority: 'high',
      });

      // Create notification database records for festive board update
      const updateNotificationPromises = allUsers.map(user =>
        NotificationService.createNotification({
          userId: user.id,
          title: 'Festive Board Updated',
          message: `The festive board "${board.title}" has been updated by admin`,
          type: NotificationType.MEAL_SELECTION,
          relatedId: board.id,
          relatedType: 'festive_board',
          metadata: {
            festiveBoardId: board.id,
            action: 'updated',
            title: board.title,
            month: board.month.toString(),
            year: board.year.toString(),
            updatedBy: authenticatedReq.user!.firstName + ' ' + authenticatedReq.user!.lastName,
            updatedByUserId: authenticatedReq.user!.userId,
          },
          sendPush: false, // FCM already sent above
        })
      );

      await Promise.all(updateNotificationPromises);

      // 2. Send separate notification for meals added (if any)
      if (addedMeals.length > 0) {
        const mealTitles = addedMeals.map(meal => meal.title).join(', ');
        await LCMService.sendToAllUsers({
          title: 'New Meals Added to Festive Board',
          body: `New meals have been added to "${board.title}": ${mealTitles}`,
          data: {
            type: 'festive_board_meals_added',
            festiveBoardId: board.id,
            festiveBoardTitle: board.title,
            mealCount: addedMeals.length.toString(),
            mealIds: addedMeals.map(meal => meal.id).join(','),
            mealTitles: mealTitles,
            addedBy: authenticatedReq.user!.firstName + ' ' + authenticatedReq.user!.lastName,
            addedByUserId: authenticatedReq.user!.userId,
          },
          priority: 'high',
        });

        // Create notification database records for meals added
        const mealsAddedNotificationPromises = allUsers.map(user =>
          NotificationService.createNotification({
            userId: user.id,
            title: 'New Meals Added to Festive Board',
            message: `New meals have been added to "${board.title}": ${mealTitles}`,
            type: NotificationType.MEAL_SELECTION,
            relatedId: board.id,
            relatedType: 'festive_board',
            metadata: {
              festiveBoardId: board.id,
              action: 'meals_added',
              festiveBoardTitle: board.title,
              mealCount: addedMeals.length.toString(),
              mealIds: addedMeals.map(meal => meal.id).join(','),
              mealTitles: mealTitles,
              addedBy: authenticatedReq.user!.firstName + ' ' + authenticatedReq.user!.lastName,
              addedByUserId: authenticatedReq.user!.userId,
            },
            sendPush: false, // FCM already sent above
          })
        );

        await Promise.all(mealsAddedNotificationPromises);
      }

      // 3. Send separate notification for meals removed (if any)
      if (removedMeals.length > 0) {
        const mealTitles = removedMeals.map(meal => meal.title).join(', ');
        await LCMService.sendToAllUsers({
          title: 'Meals Removed from Festive Board',
          body: `Meals have been removed from "${board.title}": ${mealTitles}`,
          data: {
            type: 'festive_board_meals_removed',
            festiveBoardId: board.id,
            festiveBoardTitle: board.title,
            mealCount: removedMeals.length.toString(),
            mealIds: removedMeals.map(meal => meal.id).join(','),
            mealTitles: mealTitles,
            removedBy: authenticatedReq.user!.firstName + ' ' + authenticatedReq.user!.lastName,
            removedByUserId: authenticatedReq.user!.userId,
          },
          priority: 'high',
        });

        // Create notification database records for meals removed
        const mealsRemovedNotificationPromises = allUsers.map(user =>
          NotificationService.createNotification({
            userId: user.id,
            title: 'Meals Removed from Festive Board',
            message: `Meals have been removed from "${board.title}": ${mealTitles}`,
            type: NotificationType.MEAL_SELECTION,
            relatedId: board.id,
            relatedType: 'festive_board',
            metadata: {
              festiveBoardId: board.id,
              action: 'meals_removed',
              festiveBoardTitle: board.title,
              mealCount: removedMeals.length.toString(),
              mealIds: removedMeals.map(meal => meal.id).join(','),
              mealTitles: mealTitles,
              removedBy: authenticatedReq.user!.firstName + ' ' + authenticatedReq.user!.lastName,
              removedByUserId: authenticatedReq.user!.userId,
            },
            sendPush: false, // FCM already sent above
          })
        );

        await Promise.all(mealsRemovedNotificationPromises);
      }
    } catch (fcmError) {
      console.error('FCM notification or database notification creation for festive board update failed:', fcmError);
      // Don't fail the request if notifications fail
    }

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

    // Check if board exists and get details for notification
    const existingBoard = await prisma.festiveBoard.findUnique({
      where: { id: params.id },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!existingBoard) {
      return NextResponse.json(
        { error: 'Festive board not found' },
        { status: 404 }
      );
    }

    // Send FCM notification and create database notification records for festive board deletion
    try {
      await LCMService.sendToAllUsers({
        title: 'Festive Board Deleted',
        body: `The festive board "${existingBoard.title}" has been deleted by admin`,
        data: {
          type: 'festive_board_update',
          festiveBoardId: existingBoard.id,
          action: 'deleted',
          title: existingBoard.title,
          month: existingBoard.month.toString(),
          year: existingBoard.year.toString(),
          deletedBy: authenticatedReq.user!.firstName + ' ' + authenticatedReq.user!.lastName,
          deletedByUserId: authenticatedReq.user!.userId,
        },
        priority: 'high',
      });

      // Create notification database records for all users
      const allUsers = await prisma.user.findMany({
        where: { isDeleted: false },
        select: { id: true },
      });

      // Create notification records for each user
      const notificationPromises = allUsers.map(user =>
        NotificationService.createNotification({
          userId: user.id,
          title: 'Festive Board Deleted',
          message: `The festive board "${existingBoard.title}" has been deleted by admin`,
          type: NotificationType.MEAL_SELECTION,
          relatedId: existingBoard.id,
          relatedType: 'festive_board',
          metadata: {
            festiveBoardId: existingBoard.id,
            action: 'deleted',
            title: existingBoard.title,
            month: existingBoard.month.toString(),
            year: existingBoard.year.toString(),
            deletedBy: authenticatedReq.user!.firstName + ' ' + authenticatedReq.user!.lastName,
            deletedByUserId: authenticatedReq.user!.userId,
          },
          sendPush: false, // FCM already sent above
        })
      );

      await Promise.all(notificationPromises);
    } catch (fcmError) {
      console.error('FCM notification or database notification creation for festive board deletion failed:', fcmError);
      // Don't fail the request if notifications fail
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