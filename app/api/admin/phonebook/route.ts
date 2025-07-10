import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/admin/phonebook - List all phone book entries
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const isPublic = searchParams.get('isPublic') || '';
    const skip = (page - 1) * limit;
    const where: any = {};
    if (search) {
      where.OR = [
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (isPublic !== '') where.isPublic = isPublic === 'true';
    const [phoneBookEntries, total] = await Promise.all([
      prisma.phoneBookEntry.findMany({
        where,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true, role: true, status: true },
          },
        },
        skip,
        take: limit,
        orderBy: { user: { firstName: 'asc' } },
      }),
      prisma.phoneBookEntry.count({ where }),
    ]);
    return NextResponse.json({
      phoneBookEntries,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get phone book entries error:', error);
    return NextResponse.json({ error: 'Failed to fetch phone book entries' }, { status: 500 });
  }
}

// POST /api/admin/phonebook - Create phone book entry
export async function POST(request: NextRequest) {
  try {
    const { userId, email, phone, address, isPublic } = await request.json();
    if (!userId || !email) {
      return NextResponse.json({ error: 'User and email are required' }, { status: 400 });
    }
    const phoneBookEntry = await prisma.phoneBookEntry.create({
      data: {
        userId,
        email,
        phone,
        address,
        isPublic: isPublic !== undefined ? isPublic : true,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    return NextResponse.json(phoneBookEntry, { status: 201 });
  } catch (error) {
    console.error('Create phone book entry error:', error);
    const err = error as any;
    if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002') {
      return NextResponse.json({ error: 'Phone book entry for this user already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create phone book entry' }, { status: 500 });
  }
} 