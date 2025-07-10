import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/events/[id]/rsvp - RSVP to event
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId, status } = await request.json();
    if (!userId || !status) {
      return NextResponse.json({ error: 'User ID and status are required' }, { status: 400 });
    }
    // Check if event exists and allows RSVP
    const event = await prisma.event.findUnique({
      where: { id: params.id },
    });
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    if (!event.isRSVP) {
      return NextResponse.json({ error: 'This event does not require RSVP' }, { status: 400 });
    }
    // Check if user is already registered
    const existingRSVP = await prisma.eventMember.findUnique({
      where: { eventId_userId: { eventId: params.id, userId } },
    });
    if (existingRSVP) {
      // Update existing RSVP
      const updatedRSVP = await prisma.eventMember.update({
        where: { eventId_userId: { eventId: params.id, userId } },
        data: { status },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });
      return NextResponse.json(updatedRSVP);
    } else {
      // Create new RSVP
      const newRSVP = await prisma.eventMember.create({
        data: {
          eventId: params.id,
          userId,
          status,
        },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });
      return NextResponse.json(newRSVP, { status: 201 });
    }
  } catch (error) {
    console.error('RSVP error:', error);
    return NextResponse.json({ error: 'Failed to RSVP to event' }, { status: 500 });
  }
}

// DELETE /api/events/[id]/rsvp - Cancel RSVP
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    await prisma.eventMember.delete({
      where: { eventId_userId: { eventId: params.id, userId } },
    });
    return NextResponse.json({ message: 'RSVP cancelled successfully' });
  } catch (error) {
    console.error('Cancel RSVP error:', error);
    const err = error as any;
    if (err && typeof err === 'object' && 'code' in err && err.code === 'P2025') {
      return NextResponse.json({ error: 'RSVP not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to cancel RSVP' }, { status: 500 });
  }
} 