import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { NotificationService } from '@/lib/notificationService';

export async function POST(request: NextRequest) {
    return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
        try {
            const { userId, title, message } = await request.json();
            
            if (!userId || !title || !message) {
                return NextResponse.json(
                    { error: 'Missing required fields: userId, title, message' },
                    { status: 400 }
                );
            }

            const notification = await NotificationService.createTrestleBoardNotification(
                userId,
                {
                    id: '1',
                    title: 'Test Trestle Board'
                }
            );
            return NextResponse.json({
                success: true,
                notification: {
                    ...notification,
                    createdAt: notification.createdAt.toISOString()
                }
            });
        } catch (error) {
            console.error('Error creating test notification:', error);
            return NextResponse.json(
                { error: 'Failed to create test notification' },
                { status: 500 }
            );
        }
    });
} 