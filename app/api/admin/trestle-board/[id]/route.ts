import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/admin/events/[id] - Get specific event (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const event = await prisma.trestleBoard.findUnique({
      where: { id: params.id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(event);
  } catch (error) {
    console.error('Get event error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/events/[id] - Update event (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const {
      title,
      description,
      startDate,
      endDate,
      startTime,
      endTime,
      location,
      category,
      isRSVP,
      maxAttendees,
    } = await request.json();

    // Check if event exists
    const existingEvent = await prisma.trestleBoard.findUnique({
      where: { id: params.id },
    });

    if (!existingEvent) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (startDate) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (startTime !== undefined) updateData.startTime = startTime;
    if (endTime !== undefined) updateData.endTime = endTime;
    if (location !== undefined) updateData.location = location;
    if (category) updateData.category = category;
    if (isRSVP !== undefined) updateData.isRSVP = isRSVP;
    if (maxAttendees !== undefined) updateData.maxAttendees = maxAttendees ? parseInt(maxAttendees) : null;

    // Update event
    const updatedEvent = await prisma.trestleBoard.update({
      where: { id: params.id },
      data: {
        title,
        description,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        startTime,
        endTime,
        location,
        category,
        isRSVP: isRSVP || false,
        maxAttendees: maxAttendees ? parseInt(maxAttendees) : null,
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    return NextResponse.json(updatedEvent);
  } catch (error) {
    console.error('Update event error:', error);
    const err = error as any;
    if (err && typeof err === 'object' && 'code' in err && err.code === 'P2025') {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update event' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/events/[id] - Delete event (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if event exists
    const existingEvent = await prisma.trestleBoard.findUnique({
      where: { id: params.id },
    });

    if (!existingEvent) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Delete event (this will cascade delete related records)
    await prisma.trestleBoard.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    const err = error as any;
    if (err && typeof err === 'object' && 'code' in err && err.code === 'P2025') {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    );
  }
} 