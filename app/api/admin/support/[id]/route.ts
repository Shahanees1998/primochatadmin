import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { NotificationService } from '@/lib/notificationService';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supportRequest = await prisma.supportRequest.findUnique({
            where: { id: params.id },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: true,
                        status: true,
                    },
                },
            },
        });

        if (!supportRequest) {
            return NextResponse.json(
                { error: 'Support request not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(supportRequest);
    } catch (error) {
        console.error('Error fetching support request:', error);
        return NextResponse.json(
            { error: 'Failed to fetch support request' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const { status, priority, adminResponse } = body;

        // Get the original support request to check if adminResponse is being added
        const originalRequest = await prisma.supportRequest.findUnique({
            where: { id: params.id },
            select: { adminResponse: true, userId: true, subject: true },
        });

        const supportRequest = await prisma.supportRequest.update({
            where: { id: params.id },
            data: {
                status,
                priority,
                adminResponse,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: true,
                        status: true,
                    },
                },
            },
        });

        // Send notification to user if admin added a response (new reply)
        if (adminResponse && (!originalRequest?.adminResponse || originalRequest.adminResponse !== adminResponse)) {
            try {
                await NotificationService.createSupportReplyNotification(supportRequest.userId, {
                    id: supportRequest.id,
                    subject: supportRequest.subject,
                    status: supportRequest.status,
                    priority: supportRequest.priority,
                    adminResponse: supportRequest.adminResponse
                });

                console.log(`Sent support reply notification to user ${supportRequest.userId}`);
            } catch (notificationError) {
                console.error('Error sending support reply notification:', notificationError);
                // Don't fail the support request update if notification fails
            }
        }

        return NextResponse.json(supportRequest);
    } catch (error) {
        console.error('Error updating support request:', error);
        return NextResponse.json(
            { error: 'Failed to update support request' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await prisma.supportRequest.delete({ where: { id: params.id } });

        return NextResponse.json({ message: 'Support request deleted successfully' });
    } catch (error) {
        console.error('Error deleting support request:', error);
        return NextResponse.json(
            { error: 'Failed to delete support request' },
            { status: 500 }
        );
    }
} 