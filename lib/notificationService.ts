import { prisma } from '@/lib/prisma';

export interface CreateNotificationData {
  userId: string;
  title: string;
  message: string;
  type: 'EVENT_UPDATE' | 'DOCUMENT_UPLOAD' | 'CHAT_MESSAGE' | 'BROADCAST' | 'SUPPORT_RESPONSE' | 'MEAL_SELECTION' | 'TRESTLE_BOARD_ADDED' | 'FESTIVE_BOARD_UPDATE' | 'USER_JOINED' | 'SYSTEM_ALERT';
  relatedId?: string;
  relatedType?: string;
  metadata?: any;
}

export class NotificationService {
  /**
   * Create a new notification
   */
  static async createNotification(data: CreateNotificationData) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: data.userId,
          title: data.title,
          message: data.message,
          type: data.type,
          relatedId: data.relatedId,
          relatedType: data.relatedType,
          metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profileImage: true,
            },
          },
        },
      });

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Create notification for new meal selection
   */
  static async createMealSelectionNotification(
    userId: string,
    festiveBoardId: string,
    festiveBoardTitle: string,
    mealTitle: string
  ) {
    return this.createNotification({
      userId,
      title: 'New Meal Selection',
      message: `You selected "${mealTitle}" in ${festiveBoardTitle}`,
      type: 'MEAL_SELECTION',
      relatedId: festiveBoardId,
      relatedType: 'festive_board',
      metadata: {
        festiveBoardId,
        festiveBoardTitle,
        mealTitle,
      },
    });
  }

  /**
   * Create notification for trestle board added to calendar
   */
  static async createTrestleBoardAddedNotification(
    userId: string,
    trestleBoardId: string,
    trestleBoardTitle: string
  ) {
    return this.createNotification({
      userId,
      title: 'Trestle Board Added',
      message: `"${trestleBoardTitle}" has been added to your calendar`,
      type: 'TRESTLE_BOARD_ADDED',
      relatedId: trestleBoardId,
      relatedType: 'trestle_board',
      metadata: {
        trestleBoardId,
        trestleBoardTitle,
      },
    });
  }

  /**
   * Create notification for new chat message
   */
  static async createChatMessageNotification(
    userId: string,
    chatRoomId: string,
    senderName: string,
    messageContent: string,
    chatRoomName?: string
  ) {
    return this.createNotification({
      userId,
      title: 'New Message',
      message: `${senderName} sent a message${chatRoomName ? ` in ${chatRoomName}` : ''}: ${messageContent}`,
      type: 'CHAT_MESSAGE',
      relatedId: chatRoomId,
      relatedType: 'chat_room',
      metadata: {
        chatRoomId,
        senderName,
        messageContent,
        chatRoomName,
      },
    });
  }

  /**
   * Create notification for festive board update
   */
  static async createFestiveBoardUpdateNotification(
    userId: string,
    festiveBoardId: string,
    festiveBoardTitle: string,
    updateType: string
  ) {
    return this.createNotification({
      userId,
      title: 'Festive Board Update',
      message: `${updateType} in ${festiveBoardTitle}`,
      type: 'FESTIVE_BOARD_UPDATE',
      relatedId: festiveBoardId,
      relatedType: 'festive_board',
      metadata: {
        festiveBoardId,
        festiveBoardTitle,
        updateType,
      },
    });
  }

  /**
   * Create notification for new user joined
   */
  static async createUserJoinedNotification(
    userId: string,
    newUserName: string
  ) {
    return this.createNotification({
      userId,
      title: 'New Member Added',
      message: `${newUserName} has been added to the organization`,
      type: 'USER_JOINED',
      metadata: {
        newUserName,
      },
    });
  }

  /**
   * Create notification for admin when they add a new user
   */
  static async createUserAddedByAdminNotification(
    adminUserId: string,
    newUserName: string,
    newUserEmail: string
  ) {
    return this.createNotification({
      userId: adminUserId,
      title: 'User Successfully Added',
      message: `You have successfully added ${newUserName} (${newUserEmail}) to the organization`,
      type: 'SYSTEM_ALERT',
      metadata: {
        newUserName,
        newUserEmail,
        action: 'user_added',
      },
    });
  }

  /**
   * Create system alert notification
   */
  static async createSystemAlertNotification(
    userId: string,
    title: string,
    message: string,
    metadata?: any
  ) {
    return this.createNotification({
      userId,
      title,
      message,
      type: 'SYSTEM_ALERT',
      metadata,
    });
  }

  /**
   * Create broadcast notification
   */
  static async createBroadcastNotification(
    userId: string,
    title: string,
    message: string,
    metadata?: any
  ) {
    return this.createNotification({
      userId,
      title,
      message,
      type: 'BROADCAST',
      metadata,
    });
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string) {
    try {
      const notification = await prisma.notification.update({
        where: { 
          id: notificationId,
          userId 
        },
        data: { isRead: true },
      });

      return notification;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string) {
    try {
      const result = await prisma.notification.updateMany({
        where: { 
          userId,
          isRead: false 
        },
        data: { isRead: true },
      });

      return result;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Get unread count for a user
   */
  static async getUnreadCount(userId: string) {
    try {
      const count = await prisma.notification.count({
        where: { 
          userId,
          isRead: false 
        },
      });

      return count;
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw error;
    }
  }

  /**
   * Delete old notifications (older than 30 days)
   */
  static async deleteOldNotifications() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await prisma.notification.deleteMany({
        where: {
          createdAt: {
            lt: thirtyDaysAgo,
          },
          isRead: true,
        },
      });

      return result;
    } catch (error) {
      console.error('Error deleting old notifications:', error);
      throw error;
    }
  }
} 