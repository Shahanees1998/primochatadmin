import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const categoryId = searchParams.get('categoryId');
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (categoryId && categoryId.trim() !== '') {
      where.categoryId = categoryId;
    }
    const [meals, total] = await Promise.all([
      prisma.meal.findMany({
        where,
        include: {
          category: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.meal.count({ where })
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      meals,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching meals:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, categoryId } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Meal title is required' }, { status: 400 });
    }

    if (!categoryId) {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 });
    }

    // Verify category exists
    const category = await prisma.mealCategory.findUnique({
      where: { id: categoryId }
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const meal = await prisma.meal.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        categoryId
      },
      include: {
        category: true
      }
    });

    return NextResponse.json(meal, { status: 201 });
  } catch (error) {
    console.error('Error creating meal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 