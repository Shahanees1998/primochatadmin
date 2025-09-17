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
   * Convert data object values to strings for FCM compatibility
   */
  private static convertDataToStrings(data: Record<string, any> | undefined): Record<string, string> {
    const stringData: Record<string, string> = {};
    if (data) {
      console.log('Original FCM data before conversion:', data);
      Object.entries(data).forEach(([key, value]) => {
        if (typeof value !== 'string') {
          console.log(`Converting non-string data value for key "${key}":`, typeof value, value);
        }
        
        // Handle different data types more robustly
        if (value === null || value === undefined) {
          stringData[key] = '';
        } else if (typeof value === 'string') {
          stringData[key] = value;
        } else if (typeof value === 'number' || typeof value === 'boolean') {
          stringData[key] = String(value);
        } else {
          stringData[key] = JSON.stringify(value);
        }
      });
      console.log('Converted FCM data:', stringData);
    }
    return stringData;
  }

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
  static async sendToUser(userId: string, notification: LCMPushNotification): Promise<{
    success: boolean;
    message: string;
    deviceCount: number;
    userName?: string;
  }> {
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

      if (!user) {
        return {
          success: false,
          message: `User ${userId} not found`,
          deviceCount: 0
        };
      }

      if (!user.lcmEnabled) {
        return {
          success: false,
          message: `User ${userId} has notifications disabled`,
          deviceCount: user.lcmDeviceTokens.length,
          userName: `${user.firstName} ${user.lastName}`
        };
      }

      if (user.lcmDeviceTokens.length === 0) {
        return {
          success: false,
          message: `User ${userId} has no registered device tokens`,
          deviceCount: 0,
          userName: `${user.firstName} ${user.lastName}`
        };
      }

      // Send to all user's devices
      await this.sendToMultipleTokens(user.lcmDeviceTokens, notification, {
        userId,
        userName: `${user.firstName} ${user.lastName}`
      });

      return {
        success: true,
        message: `Notification sent to ${user.lcmDeviceTokens.length} device(s)`,
        deviceCount: user.lcmDeviceTokens.length,
        userName: `${user.firstName} ${user.lastName}`
      };
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
      console.log('Users:', users?.length);
      if (users.length === 0) {
        console.log('No users with active device tokens found');
        return;
      }

      // Collect all device tokens
      const allTokens: string[] = [];
      users.forEach(user => {
        allTokens.push(...user.lcmDeviceTokens);
      });
      console.log('All tokens:', allTokens?.length);
      if (allTokens.length === 0) {
        console.log('No device tokens found');
        return;
      }

     const res = await this.sendToMultipleTokens(allTokens, notification, {
        userCount: users.length
      });

      console.log('FCM Response:', res);
    } catch (error) {
      console.error('Error sending notification to all users:', error);
      throw error;
    }
  }

  /**
   * Send push notification to specific device tokens
   */
  static async sendToMultipleTokens(
    tokens: string[], 
    notification: LCMPushNotification, 
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await this.sendViaFCM(tokens, notification);
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
      console.log('Admin:', admin);
      // Check if Firebase Admin SDK is properly initialized
      if (!admin.apps.length) {
        // Validate required environment variables
        if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
          console.log('Firebase environment variables not configured. Running in test mode.');
          console.log('FCM Test Mode - Notification would be sent to tokens:', tokens.length);
          console.log('Notification:', notification);
          return; // Exit gracefully in test mode
        }

        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          }),
        });
      }

      // Get the messaging instance
      const messaging = admin.messaging();
      console.log('Messaging:', messaging);
      
      // Convert data values to strings (FCM requirement)
      const stringData = this.convertDataToStrings(notification.data);
      console.log('FCM Data after string conversion:', stringData);
      
      // Final validation - ensure all values are strings
      const finalData: Record<string, string> = {};
      Object.entries(stringData).forEach(([key, value]) => {
        finalData[key] = typeof value === 'string' ? value : String(value);
      });
      console.log('Final validated FCM data:', finalData);
      
      // Check if sendMulticast is available, otherwise use individual sends
      if (typeof messaging.sendMulticast === 'function') {
        // Use sendMulticast for better performance
        const message = {
          notification: {
            title: notification.title,
            body: notification.body,
            imageUrl: notification.image,
          },
          data: finalData,
          android: {
            notification: {
              sound: notification.sound || 'default',
              priority: notification.priority || 'high',
              ...(notification.badge && { notificationCount: notification.badge }),
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
                ...(notification.badge && { badge: Number(notification.badge) }),
              },
            },
          },
          tokens: tokens,
        };

        const response = await messaging.sendMulticast(message);
        console.log('FCM Response0000000:', response);
        
        // Handle failed tokens
        if (response.failureCount > 0) {
          console.log('Failed tokens:', response.responses
            .map((resp: any, idx: number) => resp.success ? null : tokens[idx])
            .filter(Boolean)
          );
        }
      } else {
        // Fallback to individual sends if sendMulticast is not available
        console.log('sendMulticast not available, using individual sends');
        const results = [];
        
        for (const token of tokens) {
          try {
            const message = {
              notification: {
                title: notification.title,
                body: notification.body,
                imageUrl: notification.image,
              },
              data: finalData,
              android: {
                notification: {
                  sound: notification.sound || 'default',
                  priority: notification.priority || 'high',
                  ...(notification.badge && { notificationCount: notification.badge }),
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
                    ...(notification.badge && { badge: Number(notification.badge) }),
                  },
                },
              },
              token: token,
            };

            const result = await messaging.send(message);
            console.log('FCM Response1111111:', result);
            results.push({ token, success: true, result });
          } catch (error) {
            console.error(`Failed to send to token ${token}:`, error);
            results.push({ token, success: false, error });
          }
        }
        
        console.log('FCM Individual Results:', results);
      }
      
    } catch (error) {
      console.error('Error sending via FCM:', error);
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
