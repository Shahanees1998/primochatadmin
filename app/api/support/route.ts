import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';
import { NotificationService } from '@/lib/notificationService';

// GET /api/support - Get user's support requests
export async function GET(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '10');
      const skip = (page - 1) * limit;
      
      // Use the authenticated user's ID
      const userId = authenticatedReq.user!.userId;
      
      const [supportRequests, total] = await Promise.all([
        prisma.supportRequest.findMany({
          where: { userId },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.supportRequest.count({ where: { userId } }),
      ]);
      return NextResponse.json({
        supportRequests,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Get support requests error:', error);
      return NextResponse.json({ error: 'Failed to fetch support requests' }, { status: 500 });
    }
  });
}

// POST /api/support - Submit support request
export async function POST(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const { subject, message, priority = 'MEDIUM' } = await request.json();
      
      if (!subject || !message) {
        return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });
      }
      
      // Use the authenticated user's ID
      const userId = authenticatedReq.user!.userId;
      
      const supportRequest = await prisma.supportRequest.create({
        data: {
          userId,
          subject,
          message,
          priority,
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      // Send notification to all admin users
      try {
        const adminUsers = await prisma.user.findMany({
          where: { role: 'ADMIN' },
          select: { id: true, firstName: true, lastName: true },
        });

        const userName = `${supportRequest.user.firstName} ${supportRequest.user.lastName}`;
        
        await Promise.all(
          adminUsers.map(admin =>
            NotificationService.createSupportRequestNotification(admin.id, {
              id: supportRequest.id,
              subject: supportRequest.subject,
              priority: supportRequest.priority,
              userId: supportRequest.userId,
              userName
            })
          )
        );

        console.log(`Sent support request notifications to ${adminUsers.length} admin users`);
      } catch (notificationError) {
        console.error('Error sending support request notifications:', notificationError);
        // Don't fail the support request creation if notification fails
      }

      return NextResponse.json(supportRequest, { status: 201 });
    } catch (error) {
      console.error('Submit support request error:', error);
      return NextResponse.json({ error: 'Failed to submit support request' }, { status: 500 });
    }
  });
} 