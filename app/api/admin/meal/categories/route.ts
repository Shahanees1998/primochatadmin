import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [categories, total] = await Promise.all([
      prisma.mealCategory.findMany({
        where,
        orderBy: {
          name: 'asc'
        },
        skip,
        take: limit
      }),
      prisma.mealCategory.count({ where })
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      categories,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching meal categories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    // Check if category already exists
    const existingCategory = await prisma.mealCategory.findUnique({
      where: { name: name.trim() }
    });

    if (existingCategory) {
      return NextResponse.json({ error: 'A category with this name already exists' }, { status: 409 });
    }

    const category = await prisma.mealCategory.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null
      }
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Error creating meal category:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 