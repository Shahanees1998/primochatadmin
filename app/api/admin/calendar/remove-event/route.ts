import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';
import { LCMService } from '@/lib/lcmService';
import { NotificationService } from '@/lib/notificationService';
import { NotificationType } from '@prisma/client';

// POST /api/admin/calendar/remove-event - Remove any user event from calendar (admin only)
export async function POST(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      // Check if user is admin level 2 or 3
      const userRole = authenticatedReq.user?.role;
      if (userRole !== 'ADMINLEVELTWO' && userRole !== 'ADMINLEVELTHREE') {
        return NextResponse.json(
          { error: 'Insufficient permissions. Admin level 2 or 3 required.' },
          { status: 403 }
        );
      }

      const { eventId, eventType, userId } = await request.json();

      if (!eventId || !eventType || !userId) {
        return NextResponse.json(
          { error: 'Event ID, event type, and user ID are required' },
          { status: 400 }
        );
      }

      // Verify the target user exists
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      });

      if (!targetUser) {
        return NextResponse.json(
          { error: 'Target user not found' },
          { status: 404 }
        );
      }

      // Get target user's calendar
      const userCalendar = await prisma.userCalendar.findUnique({
        where: { userId },
      });

      if (!userCalendar) {
        return NextResponse.json(
          { error: 'User calendar not found' },
          { status: 404 }
        );
      }

      let eventDetails = null;
      let removedEventType = '';

      // Handle trestle board removal
      if (eventType === 'TRESTLE_BOARD') {
        // Check if trestle board exists in user's calendar
        if (!userCalendar.trestleBoardIds.includes(eventId)) {
          return NextResponse.json(
            { error: 'Trestle board not found in user calendar' },
            { status: 404 }
          );
        }

        // Get trestle board details for notification
        const trestleBoard = await prisma.trestleBoard.findUnique({
          where: { id: eventId },
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

        if (!trestleBoard) {
          return NextResponse.json(
            { error: 'Trestle board not found' },
            { status: 404 }
          );
        }

        eventDetails = trestleBoard;
        removedEventType = 'TRESTLE_BOARD';

        // Remove trestle board from user's calendar
        await prisma.userCalendar.update({
          where: { userId },
          data: {
            trestleBoardIds: {
              set: userCalendar.trestleBoardIds.filter(id => id !== eventId)
            }
          }
        });
      }
      // Handle custom event removal
      else if (eventType === 'CUSTOM') {
        // Check if custom event exists in user's calendar
        if (!userCalendar.customEventIds.includes(eventId)) {
          return NextResponse.json(
            { error: 'Custom event not found in user calendar' },
            { status: 404 }
          );
        }

        // Get custom event details for notification
        const customEvent = await prisma.customEvent.findUnique({
          where: { id: eventId },
          select: {
            id: true,
            title: true,
            date: true,
            time: true,
          },
        });

        if (!customEvent) {
          return NextResponse.json(
            { error: 'Custom event not found' },
            { status: 404 }
          );
        }

        eventDetails = customEvent;
        removedEventType = 'CUSTOM';

        // Remove custom event from user's calendar
        await prisma.userCalendar.update({
          where: { userId },
          data: {
            customEventIds: {
              set: userCalendar.customEventIds.filter(id => id !== eventId)
            }
          }
        });

        // Delete the custom event itself
        await prisma.customEvent.delete({
          where: { id: eventId },
        });
      } else {
        return NextResponse.json(
          { error: 'Invalid event type. Must be TRESTLE_BOARD or CUSTOM' },
          { status: 400 }
        );
      }

      // Send FCM notification to the affected user
      try {
        if (targetUser) {
          await LCMService.sendToUsers([targetUser.id], {
            title: 'Event Removed from Calendar',
            body: `An admin has removed a ${removedEventType.toLowerCase().replace('_', ' ')} event from your calendar`,
            data: {
              type: 'calendar_event_removed',
              eventId: eventId,
              eventType: removedEventType,
              eventTitle: eventDetails.title,
              removedBy: `${authenticatedReq.user?.firstName} ${authenticatedReq.user?.lastName}`,
              removedByUserId: authenticatedReq.user?.userId,
            },
            priority: 'high',
          });
        }
      } catch (fcmError) {
        console.error('FCM notification failed:', fcmError);
        // Don't fail the request if FCM fails
      }

      // Create notification database record for the affected user
      try {
        await NotificationService.createNotification({
          userId: targetUser.id,
          title: 'Event Removed from Calendar',
          message: `An admin has removed a ${removedEventType.toLowerCase().replace('_', ' ')} event from your calendar`,
          type: NotificationType.TRESTLE_BOARD_ADDED, // Using existing type for now
          relatedId: eventId,
          relatedType: 'calendar_event',
          metadata: {
            eventId: eventId,
            eventType: removedEventType,
            eventTitle: eventDetails.title,
            removedBy: `${authenticatedReq.user?.firstName} ${authenticatedReq.user?.lastName}`,
            removedByUserId: authenticatedReq.user?.userId,
            action: 'removed_by_admin',
          },
          sendPush: false, // FCM already sent above
        });
      } catch (notificationError) {
        console.error('Database notification creation failed:', notificationError);
        // Don't fail the request if notification creation fails
      }

      return NextResponse.json({
        message: `${removedEventType} event removed from user calendar successfully`,
        eventType: removedEventType,
        eventDetails: eventDetails,
        targetUser: {
          id: targetUser.id,
          name: `${targetUser.firstName} ${targetUser.lastName}`,
          email: targetUser.email,
        },
        removedBy: {
          id: authenticatedReq.user?.userId,
          name: `${authenticatedReq.user?.firstName} ${authenticatedReq.user?.lastName}`,
        },
      });
    } catch (error) {
      console.error('Admin remove event error:', error);
      return NextResponse.json(
        { error: 'Failed to remove event from user calendar' },
        { status: 500 }
      );
    }
  });
}
