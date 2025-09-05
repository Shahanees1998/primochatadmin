import { prisma } from '@/lib/prisma';

export interface LCMPushNotification {
  title: string;
  body: string;
  data?: Record<string, any>;
  image?: string;
  badge?: number;
  sound?: string;
  priority?: 'high' | 'normal';
  ttl?: number; // Time to live in seconds
}

export interface LCMDeviceInfo {
  token: string;
  platform: 'ios' | 'android' | 'web';
  appVersion?: string;
  deviceModel?: string;
  osVersion?: string;
}

export class LCMService {
  /**
   * Register a device token for a user
   */
  static async registerDeviceToken(userId: string, deviceInfo: LCMDeviceInfo): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { lcmDeviceTokens: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Add token if not already present
      const tokens = user.lcmDeviceTokens;
      if (!tokens.includes(deviceInfo.token)) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            lcmDeviceTokens: {
              push: deviceInfo.token
            }
          }
        });
      }

      console.log(`Device token registered for user ${userId}: ${deviceInfo.token}`);
    } catch (error) {
      console.error('Error registering device token:', error);
      throw error;
    }
  }

  /**
   * Unregister a device token for a user
   */
  static async unregisterDeviceToken(userId: string, token: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { lcmDeviceTokens: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Remove token if present
      const tokens = user.lcmDeviceTokens.filter(t => t !== token);
      await prisma.user.update({
        where: { id: userId },
        data: {
          lcmDeviceTokens: tokens
        }
      });

      console.log(`Device token unregistered for user ${userId}: ${token}`);
    } catch (error) {
      console.error('Error unregistering device token:', error);
      throw error;
    }
  }

  /**
   * Send push notification to a specific user
   */
  static async sendToUser(userId: string, notification: LCMPushNotification): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { 
          lcmDeviceTokens: true, 
          lcmEnabled: true,
          firstName: true,
          lastName: true 
        }
      });

      if (!user || !user.lcmEnabled || user.lcmDeviceTokens.length === 0) {
        console.log(`User ${userId} has no active device tokens or notifications disabled`);
        return;
      }

      // Send to all user's devices
      await this.sendToMultipleTokens(user.lcmDeviceTokens, notification, {
        userId,
        userName: `${user.firstName} ${user.lastName}`
      });
    } catch (error) {
      console.error('Error sending notification to user:', error);
      throw error;
    }
  }

  /**
   * Send push notification to multiple users
   */
  static async sendToUsers(userIds: string[], notification: LCMPushNotification): Promise<void> {
    try {
      const users = await prisma.user.findMany({
        where: { 
          id: { in: userIds },
          lcmEnabled: true,
          lcmDeviceTokens: { isEmpty: false }
        },
        select: { 
          id: true,
          lcmDeviceTokens: true,
          firstName: true,
          lastName: true 
        }
      });

      if (users.length === 0) {
        console.log('No users with active device tokens found');
        return;
      }

      // Collect all device tokens
      const allTokens: string[] = [];
      users.forEach(user => {
        allTokens.push(...user.lcmDeviceTokens);
      });

      if (allTokens.length === 0) {
        console.log('No device tokens found for the specified users');
        return;
      }

      await this.sendToMultipleTokens(allTokens, notification, {
        userCount: users.length
      });
    } catch (error) {
      console.error('Error sending notification to users:', error);
      throw error;
    }
  }

  /**
   * Send push notification to all users
   */
  static async sendToAllUsers(notification: LCMPushNotification): Promise<void> {
    try {
      const users = await prisma.user.findMany({
        where: { 
          lcmEnabled: true,
          lcmDeviceTokens: { isEmpty: false }
        },
        select: { 
          id: true,
          lcmDeviceTokens: true 
        }
      });

      if (users.length === 0) {
        console.log('No users with active device tokens found');
        return;
      }

      // Collect all device tokens
      const allTokens: string[] = [];
      users.forEach(user => {
        allTokens.push(...user.lcmDeviceTokens);
      });

      if (allTokens.length === 0) {
        console.log('No device tokens found');
        return;
      }

      await this.sendToMultipleTokens(allTokens, notification, {
        userCount: users.length
      });
    } catch (error) {
      console.error('Error sending notification to all users:', error);
      throw error;
    }
  }

  /**
   * Send push notification to specific device tokens
   */
  private static async sendToMultipleTokens(
    tokens: string[], 
    notification: LCMPushNotification, 
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // Choose your preferred push notification service
      const pushService = process.env.PUSH_NOTIFICATION_SERVICE || 'firebase';
      
      switch (pushService.toLowerCase()) {
        case 'firebase':
        case 'fcm':
          await this.sendViaFCM(tokens, notification);
          break;
        case 'onesignal':
          await this.sendViaOneSignal(tokens, notification);
          break;
        case 'expo':
          await this.sendViaExpo(tokens, notification);
          break;
        default:
          // Log notification details for development/testing
          console.log('Sending LCM notification:', {
            tokens: tokens.length,
            notification,
            metadata,
            service: pushService
          });
      }

    } catch (error) {
      console.error('Error sending to multiple tokens:', error);
      throw error;
    }
  }

  /**
   * Send via Firebase Cloud Messaging (FCM)
   */
  private static async sendViaFCM(tokens: string[], notification: LCMPushNotification): Promise<void> {
    try {
      const admin = require('firebase-admin');
      
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          }),
        });
      }

      const message = {
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.image,
        },
        data: notification.data,
        android: {
          notification: {
            sound: notification.sound || 'default',
            priority: notification.priority || 'high',
            badge: notification.badge?.toString(),
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: notification.title,
                body: notification.body,
              },
              sound: notification.sound || 'default',
              badge: notification.badge,
            },
          },
        },
        tokens: tokens,
      };

      const response = await admin.messaging().sendMulticast(message);
      console.log('FCM Response:', response);
      
      // Handle failed tokens
      if (response.failureCount > 0) {
        console.log('Failed tokens:', response.responses
          .map((resp: any, idx: number) => resp.success ? null : tokens[idx])
          .filter(Boolean)
        );
      }
      
    } catch (error) {
      console.error('Error sending via FCM:', error);
      throw error;
    }
  }

  /**
   * Send via OneSignal
   */
  private static async sendViaOneSignal(tokens: string[], notification: LCMPushNotification): Promise<void> {
    try {
      // Note: You need to install axios
      // npm install axios
      
      // Example implementation (uncomment and configure as needed):
      /*
      const axios = require('axios');
      
      const response = await axios.post(
        'https://onesignal.com/api/v1/notifications',
        {
          app_id: process.env.ONESIGNAL_APP_ID,
          include_player_ids: tokens,
          headings: { en: notification.title },
          contents: { en: notification.body },
          data: notification.data,
          big_picture: notification.image,
          ios_badgeType: 'Increase',
          ios_badgeCount: notification.badge,
          priority: notification.priority === 'high' ? 10 : 5,
        },
        {
          headers: {
            'Authorization': `Basic ${process.env.ONESIGNAL_REST_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('OneSignal Response:', response.data);
      */
      
      console.log('OneSignal notification would be sent:', {
        tokens: tokens.length,
        notification,
        message: 'Install axios and configure ONESIGNAL_* environment variables to enable OneSignal'
      });
    } catch (error) {
      console.error('Error sending via OneSignal:', error);
      throw error;
    }
  }

  /**
   * Send via Expo Push Notifications
   */
  private static async sendViaExpo(tokens: string[], notification: LCMPushNotification): Promise<void> {
    try {
      // Note: You need to install expo-server-sdk
      // npm install expo-server-sdk
      
      // Example implementation (uncomment and configure as needed):
      /*
      const { Expo } = require('expo-server-sdk');
      
      const expo = new Expo();
      
      const messages = tokens.map(token => ({
        to: token,
        sound: notification.sound || 'default',
        title: notification.title,
        body: notification.body,
        data: notification.data,
        badge: notification.badge,
        priority: notification.priority || 'high',
      }));

      const chunks = expo.chunkPushNotifications(messages);
      const tickets = [];

      for (const chunk of chunks) {
        try {
          const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
        } catch (error) {
          console.error('Error sending Expo notification:', error);
        }
      }

      console.log('Expo tickets:', tickets);
      */
      
      console.log('Expo notification would be sent:', {
        tokens: tokens.length,
        notification,
        message: 'Install expo-server-sdk and configure EXPO_ACCESS_TOKEN to enable Expo'
      });
    } catch (error) {
      console.error('Error sending via Expo:', error);
      throw error;
    }
  }

  /**
   * Clean up invalid device tokens
   */
  static async cleanupInvalidTokens(): Promise<void> {
    try {
      // This method would be called periodically to remove invalid tokens
      // You would typically implement this based on feedback from your push service
      console.log('Cleaning up invalid device tokens...');
      
      // TODO: Implement token cleanup logic
      // 1. Get feedback from push service about invalid tokens
      // 2. Remove invalid tokens from user records
      
    } catch (error) {
      console.error('Error cleaning up invalid tokens:', error);
      throw error;
    }
  }

  /**
   * Get user's device token count
   */
  static async getUserDeviceCount(userId: string): Promise<number> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { lcmDeviceTokens: true }
      });

      return user?.lcmDeviceTokens.length || 0;
    } catch (error) {
      console.error('Error getting user device count:', error);
      throw error;
    }
  }

  /**
   * Enable/disable push notifications for a user
   */
  static async setUserNotificationStatus(userId: string, enabled: boolean): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { lcmEnabled: enabled }
      });

      console.log(`Push notifications ${enabled ? 'enabled' : 'disabled'} for user ${userId}`);
    } catch (error) {
      console.error('Error setting user notification status:', error);
      throw error;
    }
  }
}
