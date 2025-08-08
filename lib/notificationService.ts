import prismadb from '@/configs/prismadb';
import { io } from '@/lib/socket';
import { NotificationType } from '@prisma/client';

export interface CreateNotificationData {
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    relatedId?: string;
    relatedType?: string;
    metadata?: any;
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

            // Emit socket event for real-time notification
            if (io) {
                io.to(data.userId).emit('new-notification', {
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
            }
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
            metadata: mealData
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
            metadata: trestleBoardData
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
            metadata: userData
        });
    }
} 