import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { LCMService } from '@/lib/lcmService';
import { NotificationService } from '@/lib/notificationService';
import { NotificationType } from '@prisma/client';

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    return withAdminAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
        try {
            const body = await request.json();
            const { title, content, type } = body;

            // Validate required fields
            if (!title || !content || !type) {
                return NextResponse.json(
                    { error: 'Title, content, and type are required' },
                    { status: 400 }
                );
            }

            // Get the original announcement for comparison
            const originalAnnouncement = await prisma.announcement.findUnique({
                where: { id: params.id },
                select: {
                    title: true,
                    content: true,
                    type: true,
                },
            });

            if (!originalAnnouncement) {
                return NextResponse.json(
                    { error: 'Announcement not found' },
                    { status: 404 }
                );
            }

            // Update announcement
            const announcement = await prisma.announcement.update({
                where: { id: params.id },
                data: {
                    title,
                    content,
                    type,
                },
                include: {
                    createdBy: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                },
            });

            // Check if there are any changes
            const hasChanges = 
                originalAnnouncement.title !== title ||
                originalAnnouncement.content !== content ||
                originalAnnouncement.type !== type;

            // Send notifications only if there are changes
            if (hasChanges) {
                try {
                    // Send FCM notification to all active users
                    await LCMService.sendToAllUsers({
                        title: 'Announcement Updated',
                        body: `"${title}" has been updated by admin`,
                        data: {
                            type: 'announcement_update',
                            announcementId: announcement.id,
                            action: 'updated',
                            title: title,
                            content: content,
                            announcementType: type,
                            updatedBy: authenticatedReq.user!.firstName + ' ' + authenticatedReq.user!.lastName,
                            updatedByUserId: authenticatedReq.user!.userId,
                        },
                        priority: 'high',
                    });

                    // Create notification database records for all active users
                    const allUsers = await prisma.user.findMany({
                        where: { status: 'ACTIVE' },
                        select: { id: true },
                    });

                    const notificationPromises = allUsers.map(user =>
                        NotificationService.createNotification({
                            userId: user.id,
                            title: 'Announcement Updated',
                            message: `"${title}" has been updated by admin`,
                            type: NotificationType.BROADCAST,
                            relatedId: announcement.id,
                            relatedType: 'announcement',
                            metadata: {
                                announcementId: announcement.id,
                                action: 'updated',
                                title: title,
                                content: content,
                                announcementType: type,
                                updatedBy: authenticatedReq.user!.firstName + ' ' + authenticatedReq.user!.lastName,
                                updatedByUserId: authenticatedReq.user!.userId,
                            },
                            sendPush: false, // FCM already sent above
                        })
                    );

                    await Promise.all(notificationPromises);
                } catch (notificationError) {
                    console.error('Error sending announcement update notifications:', notificationError);
                    // Don't fail the update if notifications fail
                }
            }

            return NextResponse.json({
                ...announcement,
                createdAt: announcement.createdAt.toISOString(),
                updatedAt: announcement.updatedAt.toISOString(),
            });
        } catch (error) {
            console.error('Error updating announcement:', error);
            return NextResponse.json(
                { error: 'Failed to update announcement' },
                { status: 500 }
            );
        }
    });
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    return withAdminAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
        try {
            await prisma.announcement.delete({
                where: { id: params.id },
            });

            return NextResponse.json({ message: 'Announcement deleted successfully' });
        } catch (error) {
            console.error('Error deleting announcement:', error);
            return NextResponse.json(
                { error: 'Failed to delete announcement' },
                { status: 500 }
            );
        }
    });
} 