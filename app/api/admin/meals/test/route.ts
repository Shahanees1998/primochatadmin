import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Test endpoint to check meals
export async function GET(request: NextRequest) {
  try {
    // Get all meals without any filters
    const allMeals = await prisma.meal.findMany({
      include: {
        category: true,
      },
      take: 10,
    });

    // Get meal categories
    const categories = await prisma.mealCategory.findMany({
      take: 10,
    });
    return NextResponse.json({
      data: {
        meals: allMeals,
        categories: categories,
        counts: {
          meals: allMeals.length,
          categories: categories.length,
        }
      },
    });
  } catch (error) {
    console.error('Error in test endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to fetch test data', details: error },
      { status: 500 }
    );
  }
} 