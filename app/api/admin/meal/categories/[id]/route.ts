import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const category = await prisma.mealCategory.findUnique({
      where: { id: params.id }
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error('Error fetching meal category:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    // Check if another category with the same name exists
    const existingCategory = await prisma.mealCategory.findFirst({
      where: {
        name: name.trim(),
        id: { not: params.id }
      }
    });

    if (existingCategory) {
      return NextResponse.json({ error: 'A category with this name already exists' }, { status: 409 });
    }

    const category = await prisma.mealCategory.update({
      where: { id: params.id },
      data: {
        name: name.trim(),
        description: description?.trim() || null
      }
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error('Error updating meal category:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if category has meals
    const mealsCount = await prisma.meal.count({
      where: { categoryId: params.id }
    });

    if (mealsCount > 0) {
      return NextResponse.json({ 
        error: `Cannot delete category. It has ${mealsCount} meal(s) associated with it.` 
      }, { status: 400 });
    }

    await prisma.mealCategory.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting meal category:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 