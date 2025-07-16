import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const meal = await prisma.meal.findUnique({
      where: { id: params.id },
      include: {
        category: true
      }
    });

    if (!meal) {
      return NextResponse.json({ error: 'Meal not found' }, { status: 404 });
    }

    return NextResponse.json(meal);
  } catch (error) {
    console.error('Error fetching meal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const meal = await prisma.meal.update({
      where: { id: params.id },
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        categoryId
      },
      include: {
        category: true
      }
    });

    return NextResponse.json(meal);
  } catch (error) {
    console.error('Error updating meal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.meal.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ message: 'Meal deleted successfully' });
  } catch (error) {
    console.error('Error deleting meal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 