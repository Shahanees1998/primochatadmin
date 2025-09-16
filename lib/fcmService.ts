import { prisma } from '@/lib/prisma';

interface FCMNotification {
  title: string;
  body: string;
  data?: Record<string, string>;
}

interface FCMMessage {
  to?: string;
  registration_ids?: string[];
  notification: FCMNotification;
  data?: Record<string, string>;
}

class FCMService {
  private serverKey: string;

  constructor() {
    this.serverKey = process.env.FCM_SERVER_KEY || '';
    if (!this.serverKey) {
      console.warn('FCM_SERVER_KEY not found in environment variables');
    }
  }

  private async sendNotification(message: FCMMessage): Promise<boolean> {
    if (!this.serverKey) {
      console.error('FCM server key not configured');
      return false;
    }

    try {
      const response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Authorization': `key=${this.serverKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        console.error('FCM request failed:', response.status, response.statusText);
        return false;
      }

      const result = await response.json();
      console.log('FCM notification sent:', result);
      return true;
    } catch (error) {
      console.error('FCM notification error:', error);
      return false;
    }
  }

  async sendTrestleBoardNotification(
    trestleBoardId: string,
    action: 'created' | 'updated' | 'deleted',
    trestleBoardTitle: string
  ): Promise<boolean> {
    try {
      // Get all users who are members of this trestle board
      const members = await prisma.trestleBoardMember.findMany({
        where: {
          trestleBoardId: trestleBoardId,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              lcmDeviceTokens: true,
              lcmEnabled: true,
            },
          },
        },
      });

      // Filter users with enabled notifications and device tokens
      const eligibleUsers = members.filter(
        (member) => member.user.lcmEnabled && member.user.lcmDeviceTokens.length > 0
      );

      if (eligibleUsers.length === 0) {
        console.log('No eligible users for trestle board notification');
        return true;
      }

      // Collect all device tokens
      const deviceTokens = eligibleUsers.flatMap((member) => member.user.lcmDeviceTokens);

      const actionText = action === 'created' ? 'added' : action === 'updated' ? 'updated' : 'removed';
      
      const message: FCMMessage = {
        registration_ids: deviceTokens,
        notification: {
          title: 'Trestle Board Update',
          body: `A trestle board "${trestleBoardTitle}" has been ${actionText}`,
        },
        data: {
          type: 'trestle_board_update',
          trestleBoardId: trestleBoardId,
          action: action,
          title: trestleBoardTitle,
        },
      };

      return await this.sendNotification(message);
    } catch (error) {
      console.error('Error sending trestle board notification:', error);
      return false;
    }
  }

  async sendFestiveBoardNotification(
    festiveBoardId: string,
    action: 'created' | 'updated' | 'deleted',
    festiveBoardTitle: string
  ): Promise<boolean> {
    try {
      // Get all users who have meal selections for this festive board
      const usersWithSelections = await prisma.userMealSelection.findMany({
        where: {
          festiveBoardId: festiveBoardId,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              lcmDeviceTokens: true,
              lcmEnabled: true,
            },
          },
        },
        distinct: ['userId'],
      });

      // Filter users with enabled notifications and device tokens
      const eligibleUsers = usersWithSelections.filter(
        (selection) => selection.user.lcmEnabled && selection.user.lcmDeviceTokens.length > 0
      );

      if (eligibleUsers.length === 0) {
        console.log('No eligible users for festive board notification');
        return true;
      }

      // Collect all device tokens
      const deviceTokens = eligibleUsers.flatMap((selection) => selection.user.lcmDeviceTokens);

      const actionText = action === 'created' ? 'added' : action === 'updated' ? 'updated' : 'removed';
      
      const message: FCMMessage = {
        registration_ids: deviceTokens,
        notification: {
          title: 'Festive Board Update',
          body: `A festive board "${festiveBoardTitle}" has been ${actionText}`,
        },
        data: {
          type: 'festive_board_update',
          festiveBoardId: festiveBoardId,
          action: action,
          title: festiveBoardTitle,
        },
      };

      return await this.sendNotification(message);
    } catch (error) {
      console.error('Error sending festive board notification:', error);
      return false;
    }
  }

  async sendToSpecificUsers(
    userIds: string[],
    notification: FCMNotification,
    data?: Record<string, string>
  ): Promise<boolean> {
    try {
      const users = await prisma.user.findMany({
        where: {
          id: {
            in: userIds,
          },
          lcmEnabled: true,
        },
        select: {
          lcmDeviceTokens: true,
        },
      });

      const deviceTokens = users.flatMap((user) => user.lcmDeviceTokens);

      if (deviceTokens.length === 0) {
        console.log('No device tokens found for specified users');
        return true;
      }

      const message: FCMMessage = {
        registration_ids: deviceTokens,
        notification,
        data,
      };

      return await this.sendNotification(message);
    } catch (error) {
      console.error('Error sending notification to specific users:', error);
      return false;
    }
  }

  async sendAdminNotification(
    notification: FCMNotification,
    data?: Record<string, string>
  ): Promise<boolean> {
    try {
      // Get all admin users
      const adminUsers = await prisma.user.findMany({
        where: {
          role: 'ADMIN',
          lcmEnabled: true,
        },
        select: {
          lcmDeviceTokens: true,
        },
      });

      const deviceTokens = adminUsers.flatMap((user) => user.lcmDeviceTokens);

      if (deviceTokens.length === 0) {
        console.log('No admin device tokens found');
        return true;
      }

      const message: FCMMessage = {
        registration_ids: deviceTokens,
        notification,
        data,
      };

      return await this.sendNotification(message);
    } catch (error) {
      console.error('Error sending admin notification:', error);
      return false;
    }
  }

  async sendUserChangeNotification(
    type: 'trestle_board' | 'festive_board',
    action: 'joined' | 'left' | 'meal_selected' | 'meal_deselected',
    itemId: string,
    itemTitle: string,
    userName: string,
    userId: string
  ): Promise<boolean> {
    try {
      // Send notification to admins
      const adminNotification = this.getUserChangeNotification(type, action, itemTitle, userName);
      await this.sendAdminNotification(adminNotification, {
        type: `${type}_user_change`,
        action,
        itemId,
        itemTitle,
        userName,
        userId,
      });

      // Send notification to other users in the same board/event
      if (type === 'trestle_board') {
        await this.sendTrestleBoardUserChangeNotification(itemId, action, itemTitle, userName, userId);
      } else if (type === 'festive_board') {
        await this.sendFestiveBoardUserChangeNotification(itemId, action, itemTitle, userName, userId);
      }

      return true;
    } catch (error) {
      console.error('Error sending user change notification:', error);
      return false;
    }
  }

  private getUserChangeNotification(
    type: 'trestle_board' | 'festive_board',
    action: 'joined' | 'left' | 'meal_selected' | 'meal_deselected',
    itemTitle: string,
    userName: string
  ): FCMNotification {
    const typeText = type === 'trestle_board' ? 'Trestle Board' : 'Festive Board';
    
    let actionText = '';
    switch (action) {
      case 'joined':
        actionText = 'joined';
        break;
      case 'left':
        actionText = 'left';
        break;
      case 'meal_selected':
        actionText = 'selected a meal in';
        break;
      case 'meal_deselected':
        actionText = 'deselected a meal in';
        break;
    }

    return {
      title: `${typeText} Update`,
      body: `${userName} ${actionText} ${itemTitle}`,
    };
  }

  private async sendTrestleBoardUserChangeNotification(
    trestleBoardId: string,
    action: string,
    itemTitle: string,
    userName: string,
    userId: string
  ): Promise<boolean> {
    try {
      // Get all members of this trestle board except the user who made the change
      const members = await prisma.trestleBoardMember.findMany({
        where: {
          trestleBoardId: trestleBoardId,
          userId: {
            not: userId,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              lcmDeviceTokens: true,
              lcmEnabled: true,
            },
          },
        },
      });

      const eligibleUsers = members.filter(
        (member) => member.user.lcmEnabled && member.user.lcmDeviceTokens.length > 0
      );

      if (eligibleUsers.length === 0) {
        return true;
      }

      const deviceTokens = eligibleUsers.flatMap((member) => member.user.lcmDeviceTokens);

      const message: FCMMessage = {
        registration_ids: deviceTokens,
        notification: {
          title: 'Trestle Board Update',
          body: `${userName} ${action} ${itemTitle}`,
        },
        data: {
          type: 'trestle_board_user_change',
          trestleBoardId,
          action,
          itemTitle,
          userName,
          userId,
        },
      };

      return await this.sendNotification(message);
    } catch (error) {
      console.error('Error sending trestle board user change notification:', error);
      return false;
    }
  }

  private async sendFestiveBoardUserChangeNotification(
    festiveBoardId: string,
    action: string,
    itemTitle: string,
    userName: string,
    userId: string
  ): Promise<boolean> {
    try {
      // Get all users who have meal selections for this festive board except the user who made the change
      const usersWithSelections = await prisma.userMealSelection.findMany({
        where: {
          festiveBoardId: festiveBoardId,
          userId: {
            not: userId,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              lcmDeviceTokens: true,
              lcmEnabled: true,
            },
          },
        },
        distinct: ['userId'],
      });

      const eligibleUsers = usersWithSelections.filter(
        (selection) => selection.user.lcmEnabled && selection.user.lcmDeviceTokens.length > 0
      );

      if (eligibleUsers.length === 0) {
        return true;
      }

      const deviceTokens = eligibleUsers.flatMap((selection) => selection.user.lcmDeviceTokens);

      const message: FCMMessage = {
        registration_ids: deviceTokens,
        notification: {
          title: 'Festive Board Update',
          body: `${userName} ${action} ${itemTitle}`,
        },
        data: {
          type: 'festive_board_user_change',
          festiveBoardId,
          action,
          itemTitle,
          userName,
          userId,
        },
      };

      return await this.sendNotification(message);
    } catch (error) {
      console.error('Error sending festive board user change notification:', error);
      return false;
    }
  }
}

export const fcmService = new FCMService();
