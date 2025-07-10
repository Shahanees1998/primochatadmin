import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/chat - Get messages
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;
    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        include: {
          sender: {
            select: { id: true, firstName: true, lastName: true, email: true, profileImage: true },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.message.count(),
    ]);
    return NextResponse.json({
      messages: messages.reverse(), // Show oldest first
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// POST /api/chat - Send message
export async function POST(request: NextRequest) {
  try {
    const { senderId, content, type = 'TEXT' } = await request.json();
    if (!senderId || !content) {
      return NextResponse.json({ error: 'Sender ID and content are required' }, { status: 400 });
    }
    const message = await prisma.message.create({
      data: {
        senderId,
        content,
        type,
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, email: true, profileImage: true },
        },
      },
    });
    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
} 