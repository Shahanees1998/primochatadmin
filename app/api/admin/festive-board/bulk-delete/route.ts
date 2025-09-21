import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';
import { LCMService } from '@/lib/lcmService';
import { NotificationService } from '@/lib/notificationService';
import { NotificationType } from '@prisma/client';

// POST /api/admin/festive-board/bulk-delete - Bulk delete festive boards
export async function POST(request: NextRequest) {
  return withAdminAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const { ids } = await request.json();

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json(
          { error: 'Invalid or empty IDs array' },
          { status: 400 }
        );
      }

      // Get all festive boards to be deleted for notification details
      const boardsToDelete = await prisma.festiveBoard.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          title: true,
          month: true,
          year: true,
        },
      });

      if (boardsToDelete.length === 0) {
        return NextResponse.json(
          { error: 'No festive boards found to delete' },
          { status: 404 }
        );
      }

      // Delete all festive boards
      await prisma.festiveBoard.deleteMany({
        where: { id: { in: ids } },
      });

      // Send single FCM notification for bulk deletion
      try {
        await LCMService.sendToAllUsers({
          title: 'Festive Boards Deleted',
          body: `${boardsToDelete.length} festive board(s) have been deleted by admin`,
          data: {
            type: 'festive_board_bulk_delete',
            action: 'bulk_deleted',
            count: boardsToDelete.length,
            deletedBy: authenticatedReq.user!.firstName + ' ' + authenticatedReq.user!.lastName,
            deletedByUserId: authenticatedReq.user!.userId,
            deletedBoards: boardsToDelete.map(board => ({
              id: board.id,
              title: board.title,
              month: board.month,
              year: board.year,
            })),
          },
          priority: 'high',
        });

        // Create single notification database record for all users
        const allUsers = await prisma.user.findMany({
          where: { isDeleted: false },
          select: { id: true },
        });

        // Create notification records for each user
        const notificationPromises = allUsers.map(user =>
          NotificationService.createNotification({
            userId: user.id,
            title: 'Festive Boards Deleted',
            message: `${boardsToDelete.length} festive board(s) have been deleted by admin`,
            type: NotificationType.MEAL_SELECTION,
            relatedId: undefined, // No specific related ID for bulk operations
            relatedType: 'festive_board_bulk_delete',
            metadata: {
              action: 'bulk_deleted',
              count: boardsToDelete.length,
              deletedBy: authenticatedReq.user!.firstName + ' ' + authenticatedReq.user!.lastName,
              deletedByUserId: authenticatedReq.user!.userId,
              deletedBoards: boardsToDelete.map(board => ({
                id: board.id,
                title: board.title,
                month: board.month,
                year: board.year,
              })),
            },
            sendPush: false, // FCM already sent above
          })
        );

        await Promise.all(notificationPromises);
      } catch (fcmError) {
        console.error('FCM notification or database notification creation for festive board bulk deletion failed:', fcmError);
        // Don't fail the request if notifications fail
      }

      return NextResponse.json({
        message: `${boardsToDelete.length} festive board(s) deleted successfully`,
        deletedCount: boardsToDelete.length,
      });
    } catch (error) {
      console.error('Error bulk deleting festive boards:', error);
      return NextResponse.json(
        { error: 'Failed to bulk delete festive boards' },
        { status: 500 }
      );
    }
  });
}
