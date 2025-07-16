import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth, AuthenticatedRequest } from '@/lib/authMiddleware';

export async function GET(request: NextRequest) {
  return withAdminAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '10');
      const search = searchParams.get('search') || '';
      const type = searchParams.get('type') || '';
      const status = searchParams.get('status') || '';
      const sortField = searchParams.get('sortField') || 'createdAt';
      const sortOrder = parseInt(searchParams.get('sortOrder') || '-1');
      const skip = (page - 1) * limit;
      const where: any = {};
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } },
        ];
      }
      if (type && type.trim()) {
        where.type = type;
      }
      if (status && status.trim()) {
        where.status = status;
      }
      const orderBy: any = {};
      orderBy[sortField] = sortOrder === 1 ? 'asc' : 'desc';
      const [announcements, total] = await Promise.all([
        prisma.announcement.findMany({
          where,
          skip,
          take: limit,
          orderBy,
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
        }),
        prisma.announcement.count({ where }),
      ]);
      return NextResponse.json({
        announcements: announcements.map(announcement => ({
          ...announcement,
          createdAt: announcement.createdAt.toISOString(),
          updatedAt: announcement.updatedAt.toISOString(),
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error fetching announcements:', error);
      return NextResponse.json(
        { error: 'Failed to fetch announcements' },
        { status: 500 }
      );
    }
  });
}

export async function POST(request: NextRequest) {
  return withAdminAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const body = await request.json();
      const { title, content, type } = body;
      const adminId = authenticatedReq.user?.userId;
      if (!title || !content || !type) {
        return NextResponse.json(
          { error: 'Title, content, and type are required' },
          { status: 400 }
        );
      }
      if (!adminId) {
        return NextResponse.json(
          { error: 'Admin user not found in request context' },
          { status: 400 }
        );
      }
      // Create announcement (immediate, no scheduling/targeting)
      const announcement = await prisma.announcement.create({
        data: {
          title,
          content,
          type,
          status: 'PUBLISHED',
          createdById: adminId,
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
      // Send notification to all members
      const allMembers = await prisma.user.findMany({ where: { status: 'ACTIVE' }, select: { id: true } });
      await Promise.all(
        allMembers.map(member =>
          prisma.notification.create({
            data: {
              userId: member.id,
              title: `Announcement: ${title}`,
              message: content,
              type: 'BROADCAST',
            },
          })
        )
      );
      return NextResponse.json({
        ...announcement,
        createdAt: announcement.createdAt.toISOString(),
        updatedAt: announcement.updatedAt.toISOString(),
      }, { status: 201 });
    } catch (error) {
      console.error('Error creating announcement:', error);
      return NextResponse.json(
        { error: 'Failed to create announcement' },
        { status: 500 }
      );
    }
  });
} 