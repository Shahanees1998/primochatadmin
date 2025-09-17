import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';
import { LCMService } from '@/lib/lcmService';
import { NotificationService } from '@/lib/notificationService';
import { NotificationType } from '@prisma/client';

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

      // Send FCM notification and create database notification records for new meal added to festive board
      try {
        // Send notification to ALL users about new meal being added

        console.log('Sending FCM notification to all users');
        await LCMService.sendToAllUsers({
          title: 'New Meal Added to Festive Board',
          body: `A new meal "${newMeal.title}" has been added to ${festiveBoard.title}`,
          data: {
            type: 'festive_board_meal_added',
            festiveBoardId: festiveBoardId,
            mealId: newMeal.id,
            mealTitle: newMeal.title,
            festiveBoardTitle: festiveBoard.title,
            addedBy: `${mealSelection.user.firstName} ${mealSelection.user.lastName}`,
            addedByUserId: userId,
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
            title: 'New Meal Added to Festive Board',
            message: `A new meal "${newMeal.title}" has been added to ${festiveBoard.title}`,
            type: NotificationType.MEAL_SELECTION,
            relatedId: festiveBoardId,
            relatedType: 'festive_board',
            metadata: {
              festiveBoardId: festiveBoardId,
              mealId: newMeal.id,
              mealTitle: newMeal.title,
              festiveBoardTitle: festiveBoard.title,
              addedBy: `${mealSelection.user.firstName} ${mealSelection.user.lastName}`,
              addedByUserId: userId,
            },
            sendPush: false, // FCM already sent above
          })
        );

        await Promise.all(notificationPromises);
      } catch (fcmError) {
        console.error('FCM notification or database notification creation for new meal failed:', fcmError);
        // Don't fail the request if notifications fail
      }

      // Send FCM notification for meal selection
      try {
        // Send to admins
        const adminUsers = await prisma.user.findMany({
          where: { role: 'ADMIN', lcmEnabled: true },
          select: { id: true },
        });
        
        if (adminUsers.length > 0) {
          await LCMService.sendToUsers(adminUsers.map(u => u.id), {
            title: 'Festive Board Update',
            body: `${mealSelection.user.firstName} ${mealSelection.user.lastName} selected a meal in ${festiveBoard.title}`,
            data: {
              type: 'festive_board_user_change',
              action: 'meal_selected',
              festiveBoardId: festiveBoardId,
              itemTitle: festiveBoard.title,
              userName: `${mealSelection.user.firstName} ${mealSelection.user.lastName}`,
              userId: userId,
            },
            priority: 'high',
          });
        }

        // Send to other users who have meal selections for this festive board
        const otherUsersWithSelections = await prisma.userMealSelection.findMany({
          where: {
            festiveBoardId: festiveBoardId,
            userId: { not: userId },
          },
          include: {
            user: {
              select: {
                id: true,
                lcmEnabled: true,
              },
            },
          },
          distinct: ['userId'],
        });

        const eligibleUserIds = otherUsersWithSelections
          .filter(selection => selection.user.lcmEnabled)
          .map(selection => selection.user.id);

        if (eligibleUserIds.length > 0) {
          await LCMService.sendToUsers(eligibleUserIds, {
            title: 'Festive Board Update',
            body: `${mealSelection.user.firstName} ${mealSelection.user.lastName} selected a meal in ${festiveBoard.title}`,
            data: {
              type: 'festive_board_user_change',
              action: 'meal_selected',
              festiveBoardId: festiveBoardId,
              itemTitle: festiveBoard.title,
              userName: `${mealSelection.user.firstName} ${mealSelection.user.lastName}`,
              userId: userId,
            },
            priority: 'high',
          });
        }
      } catch (fcmError) {
        console.error('FCM notification for meal selection failed:', fcmError);
        // Don't fail the request if FCM fails
      }

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
