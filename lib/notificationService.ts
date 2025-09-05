import prismadb from '@/configs/prismadb';
import { pusherServer } from '@/lib/realtime';
import { NotificationType } from '@prisma/client';
import { LCMService, LCMPushNotification } from '@/lib/lcmService';

export interface CreateNotificationData {
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    relatedId?: string;
    relatedType?: string;
    metadata?: any;
    sendPush?: boolean; // Whether to send push notification
}

export class NotificationService {
    static async createNotification(data: CreateNotificationData) {
        try {
            const notification = await prismadb.notification.create({
                data: {
                    userId: data.userId,
                    title: data.title,
                    message: data.message,
                    type: data.type,
                    relatedId: data.relatedId,
                    relatedType: data.relatedType,
                    metadata: data.metadata ? JSON.stringify(data.metadata) : null,
                    isRead: false,
                    isArchived: false
                }
            });

            // Emit Pusher event for real-time notification
            await pusherServer.trigger(`user-${data.userId}`, 'new-notification', {
                id: notification.id,
                title: notification.title,
                message: notification.message,
                type: notification.type,
                isRead: notification.isRead,
                createdAt: notification.createdAt,
                relatedId: notification.relatedId,
                relatedType: notification.relatedType,
                metadata: notification.metadata
            });

            // Send push notification if requested
            if (data.sendPush !== false) { // Default to true unless explicitly set to false
                try {
                    const pushNotification: LCMPushNotification = {
                        title: data.title,
                        body: data.message,
                        data: {
                            notificationId: notification.id,
                            type: data.type,
                            relatedId: data.relatedId,
                            relatedType: data.relatedType,
                            ...data.metadata
                        },
                        badge: 1,
                        priority: 'high'
                    };

                    await LCMService.sendToUser(data.userId, pushNotification);
                } catch (pushError) {
                    console.error('Error sending push notification:', pushError);
                    // Don't fail the main notification creation if push fails
                }
            }

            return notification;
        } catch (error) {
            console.error('Error creating notification:', error);
            throw error;
        }
    }

    static async createChatMessageNotification(userId: string, message: any, chatRoom: any) {
        const senderName = message.sender ? `${message.sender.firstName} ${message.sender.lastName}` : 'Someone';
        
        return this.createNotification({
            userId,
            title: 'New Message',
            message: `${senderName}: ${message.content}`,
            type: NotificationType.CHAT_MESSAGE,
            relatedId: chatRoom.id,
            relatedType: 'chat_room',
            metadata: {
                messageId: message.id,
                senderId: message.senderId,
                chatRoomId: chatRoom.id,
                chatRoomTitle: chatRoom.title
            },
            sendPush: true // Always send push for chat messages
        });
    }

    static async createMealSelectionNotification(userId: string, mealData: any) {
        return this.createNotification({
            userId,
            title: 'Meal Selection',
            message: `New meal selection in ${mealData.festiveBoardTitle}`,
            type: NotificationType.MEAL_SELECTION,
            relatedId: mealData.festiveBoardId,
            relatedType: 'festive_board',
            metadata: mealData,
            sendPush: true
        });
    }

    static async createTrestleBoardNotification(userId: string, trestleBoardData: any) {
        return this.createNotification({
            userId,
            title: 'Trestle Board Added',
            message: `New trestle board "${trestleBoardData.title}" added to your calendar`,
            type: NotificationType.TRESTLE_BOARD_ADDED,
            relatedId: trestleBoardData.id,
            relatedType: 'trestle_board',
            metadata: trestleBoardData,
            sendPush: true
        });
    }

    static async createUserJoinedNotification(userId: string, userData: any) {
        return this.createNotification({
            userId,
            title: 'New User Added',
            message: `New user ${userData.firstName} ${userData.lastName} has been added`,
            type: NotificationType.USER_JOINED,
            relatedId: userData.id,
            relatedType: 'user',
            metadata: userData,
            sendPush: false // Don't send push for user joined notifications
        });
    }

    static async markAsRead(notificationId: string, userId: string) {
        const notification = await prismadb.notification.update({
            where: {
                id: notificationId,
                userId: userId
            },
            data: {
                isRead: true
            }
        });

        // Emit Pusher event for real-time update
        await pusherServer.trigger(`user-${userId}`, 'notification-updated', {
            id: notification.id,
            isRead: notification.isRead
        });

        return notification;
    }

    static async markAllAsRead(userId: string) {
        const result = await prismadb.notification.updateMany({
            where: {
                userId: userId,
                isRead: false
            },
            data: {
                isRead: true
            }
        });

        // Emit Pusher event for real-time update
        await pusherServer.trigger(`user-${userId}`, 'all-notifications-read', {
            count: result.count
        });

        return result;
    }
} 