import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Get user session from token
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - User not authenticated' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const body = await request.json();
    
    const {
      festiveBoardId,
      mealName,
      mealDescription,
      mealType, // breakfast, lunch, dinner, snack
      mealDate,
      dietaryRestrictions, // vegetarian, vegan, gluten-free, etc.
      allergens,
      nutritionalInfo,
      imageUrl,
      price,
      preparationTime,
      servingSize,
      isAvailable
    } = body;

    // Validate required fields
    if (!festiveBoardId || !mealName || !mealType || !mealDate) {
      return NextResponse.json(
        { error: 'Missing required fields: festiveBoardId, mealName, mealType, mealDate' },
        { status: 400 }
      );
    }

    // Verify festive board exists
    const festiveBoard = await prisma.festiveBoard.findUnique({
      where: { id: festiveBoardId },
      include: { meals: true }
    });

    if (!festiveBoard) {
      return NextResponse.json(
        { error: 'Festive board not found' },
        { status: 404 }
      );
    }

    // Create new meal
    const newMeal = await prisma.meal.create({
      data: {
        name: mealName,
        description: mealDescription || '',
        type: mealType,
        date: new Date(mealDate),
        dietaryRestrictions: dietaryRestrictions || [],
        allergens: allergens || [],
        nutritionalInfo: nutritionalInfo || {},
        imageUrl: imageUrl || '',
        price: price || 0,
        preparationTime: preparationTime || 0,
        servingSize: servingSize || '',
        isAvailable: isAvailable !== undefined ? isAvailable : true,
        createdBy: userId,
        updatedBy: userId
      }
    });

    // Add meal to festive board
    const festiveBoardMeal = await prisma.festiveBoardMeal.create({
      data: {
        festiveBoardId: festiveBoardId,
        mealId: newMeal.id,
        addedBy: userId,
        addedAt: new Date()
      }
    });

    // Create meal selection for the user
    const mealSelection = await prisma.mealSelection.create({
      data: {
        userId: userId,
        mealId: newMeal.id,
        festiveBoardId: festiveBoardId,
        selectedAt: new Date(),
        status: 'selected' // selected, consumed, cancelled
      }
    });

    // Return the created meal with selection info
    const result = {
      meal: newMeal,
      festiveBoardMeal: festiveBoardMeal,
      mealSelection: mealSelection,
      message: 'Meal created and selected successfully'
    };

    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    console.error('Error in select-meal API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get user session from token
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - User not authenticated' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const festiveBoardId = searchParams.get('festiveBoardId');

    if (!festiveBoardId) {
      return NextResponse.json(
        { error: 'festiveBoardId is required' },
        { status: 400 }
      );
    }

    // Get user's meal selections for the specific festive board
    const mealSelections = await prisma.mealSelection.findMany({
      where: {
        userId: userId,
        festiveBoardId: festiveBoardId
      },
      include: {
        meal: true,
        festiveBoard: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      },
      orderBy: {
        selectedAt: 'desc'
      }
    });

    return NextResponse.json({
      mealSelections,
      count: mealSelections.length
    });

  } catch (error) {
    console.error('Error in select-meal GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

