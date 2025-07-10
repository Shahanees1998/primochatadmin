import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/admin/support - List all support requests
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const priority = searchParams.get('priority') || '';
    const skip = (page - 1) * limit;
    const where: any = {};
    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) where.status = status;
    if (priority) where.priority = priority;
    const [supportRequests, total] = await Promise.all([
      prisma.supportRequest.findMany({
        where,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.supportRequest.count({ where }),
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
}

// POST /api/admin/support - Create support request (for testing)
export async function POST(request: NextRequest) {
  try {
    const { userId, subject, message, priority } = await request.json();
    if (!userId || !subject || !message) {
      return NextResponse.json({ error: 'User, subject, and message are required' }, { status: 400 });
    }
    const supportRequest = await prisma.supportRequest.create({
      data: {
        userId,
        subject,
        message,
        priority: priority || 'MEDIUM',
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    return NextResponse.json(supportRequest, { status: 201 });
  } catch (error) {
    console.error('Create support request error:', error);
    return NextResponse.json({ error: 'Failed to create support request' }, { status: 500 });
  }
} 