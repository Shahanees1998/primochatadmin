import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

// GET /api/admin/user-calendars - Get all user calendars (admin only)
export async function GET(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      // Check if user is admin
      // if (authenticatedReq.user?.role !== 'ADMIN') {
      //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      // }

      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '10');
      const search = searchParams.get('search') || '';

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {
        isDeleted: false
      };
      
      if (search) {
        where.user = {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { membershipNumber: { contains: search, mode: 'insensitive' } },
          ],
        };
      }

      // Get user calendars with pagination
      const [userCalendars, total] = await Promise.all([
        prisma.userCalendar.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                membershipNumber: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.userCalendar.count({ where }),
      ]);

      return NextResponse.json({
        userCalendars,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Get user calendars error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch user calendars' },
        { status: 500 }
      );
    }
  });
}

// POST /api/admin/user-calendars - Create new user calendar (admin only)
export async function POST(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      // Check if user is admin
      // if (authenticatedReq.user?.role !== 'ADMIN') {
      //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      // }

      const { userId } = await request.json();

      if (!userId) {
        return NextResponse.json(
          { error: 'User ID is required' },
          { status: 400 }
        );
      }

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Check if user already has a calendar
      const existingCalendar = await prisma.userCalendar.findUnique({
        where: { userId },
      });

      if (existingCalendar) {
        return NextResponse.json(
          { error: 'User already has a calendar' },
          { status: 400 }
        );
      }

      // Create user calendar
      const userCalendar = await prisma.userCalendar.create({
        data: {
          userId,
          trestleBoardIds: [],
          customEventIds: [],
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              membershipNumber: true,
            },
          },
        },
      });

      return NextResponse.json(userCalendar, { status: 201 });
    } catch (error) {
      console.error('Create user calendar error:', error);
      return NextResponse.json(
        { error: 'Failed to create user calendar' },
        { status: 500 }
      );
    }
  });
} 