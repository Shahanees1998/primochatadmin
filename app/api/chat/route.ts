import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

// GET /api/chat - Get messages (authenticated users only)
export async function GET(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
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
            chatRoom: {
              select: { id: true, name: true },
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
  });
}

// POST /api/chat - Send message (authenticated users only)
export async function POST(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      const { content, type = 'TEXT', chatRoomId } = await request.json();
      
      if (!content || !chatRoomId) {
        return NextResponse.json({ error: 'Content and chat room ID are required' }, { status: 400 });
      }
      
      // Use the authenticated user's ID as sender
      const senderId = authenticatedReq.user!.userId;
      
      const message = await prisma.message.create({
        data: {
          senderId,
          content,
          type,
          chatRoomId,
        },
        include: {
          sender: {
            select: { id: true, firstName: true, lastName: true, email: true, profileImage: true },
          },
          chatRoom: {
            select: { id: true, name: true },
          },
        },
      });
      return NextResponse.json(message, { status: 201 });
    } catch (error) {
      console.error('Send message error:', error);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }
  });
} 