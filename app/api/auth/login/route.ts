import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Authenticate user
    const { accessToken, refreshToken } = await AuthService.authenticateUser({
      email,
      password,
    });

    // Get user details for response
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        status: true,
        membershipNumber: true,
        profileImage: true,
        profileImagePublicId: true,
        joinDate: true,
        paidDate: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    });
console.log('user', user);
    // Create response with token for mobile apps
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      accessToken, // Include token for mobile apps
      refreshToken, // Include refresh token for mobile apps
      user: {
        id: user?.id,
        email: user?.email,
        firstName: user?.firstName,
        lastName: user?.lastName,
        phone: user?.phone,
        role: user?.role,
        status: user?.status,
        membershipNumber: user?.membershipNumber,
        profileImage: user?.profileImage,
        profileImagePublicId: user?.profileImagePublicId,
        joinDate: user?.joinDate,
        paidDate: user?.paidDate,
        lastLogin: user?.lastLogin,
        createdAt: user?.createdAt,
        updatedAt: user?.updatedAt,
      },
    });
   console.log('response', response);
    // Set authentication cookies for web apps
    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: '/',
    });

    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 