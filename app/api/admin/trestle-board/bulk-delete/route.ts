import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';
import { LCMService } from '@/lib/lcmService';
import { NotificationService } from '@/lib/notificationService';
import { NotificationType } from '@prisma/client';

// POST /api/admin/trestle-board/bulk-delete - Bulk delete trestle boards
export async function POST(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const { ids } = await request.json();

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json(
          { error: 'Invalid or empty IDs array' },
          { status: 400 }
        );
      }

      // Get all trestle boards to be deleted for notification details
      const boardsToDelete = await prisma.trestleBoard.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          title: true,
          description: true,
          date: true,
          time: true,
          location: true,
          category: true,
        },
      });

      if (boardsToDelete.length === 0) {
        return NextResponse.json(
          { error: 'No trestle boards found to delete' },
          { status: 404 }
        );
      }

      // Delete all trestle boards
      await prisma.trestleBoard.deleteMany({
        where: { id: { in: ids } },
      });

      // Send single FCM notification for bulk deletion
      try {
        await LCMService.sendToAllUsers({
          title: 'Trestle Boards Deleted',
          body: `${boardsToDelete.length} trestle board(s) have been deleted by admin`,
          data: {
            type: 'trestle_board_bulk_delete',
            action: 'bulk_deleted',
            count: boardsToDelete.length,
            deletedBy: authenticatedReq.user!.firstName + ' ' + authenticatedReq.user!.lastName,
            deletedByUserId: authenticatedReq.user!.userId,
            deletedBoards: boardsToDelete.map(board => ({
              id: board.id,
              title: board.title,
              description: board.description,
              date: board.date.toISOString(),
              time: board.time,
              location: board.location,
              category: board.category,
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
            title: 'Trestle Boards Deleted',
            message: `${boardsToDelete.length} trestle board(s) have been deleted by admin`,
            type: NotificationType.TRESTLE_BOARD_ADDED, // Using same type as creation for now
            relatedId: undefined, // No specific related ID for bulk operations
            relatedType: 'trestle_board_bulk_delete',
            metadata: {
              action: 'bulk_deleted',
              count: boardsToDelete.length,
              deletedBy: authenticatedReq.user!.firstName + ' ' + authenticatedReq.user!.lastName,
              deletedByUserId: authenticatedReq.user!.userId,
              deletedBoards: boardsToDelete.map(board => ({
                id: board.id,
                title: board.title,
                description: board.description,
                date: board.date.toISOString(),
                time: board.time,
                location: board.location,
                category: board.category,
              })),
            },
            sendPush: false, // FCM already sent above
          })
        );

        await Promise.all(notificationPromises);
      } catch (fcmError) {
        console.error('FCM notification or database notification creation for trestle board bulk deletion failed:', fcmError);
        // Don't fail the request if notifications fail
      }

      return NextResponse.json({
        message: `${boardsToDelete.length} trestle board(s) deleted successfully`,
        deletedCount: boardsToDelete.length,
      });
    } catch (error) {
      console.error('Error bulk deleting trestle boards:', error);
      return NextResponse.json(
        { error: 'Failed to bulk delete trestle boards' },
        { status: 500 }
      );
    }
  });
}
