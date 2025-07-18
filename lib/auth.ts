import { SignJWT, jwtVerify, decodeJwt } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

// JWT Configuration
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || '7b537c24d1f5b2a460c4b3f88ad3e78b2f7462d49a9d9a93c3c86b48a211bc39'
);

const ACCESS_TOKEN_EXPIRY = '7d'; // 7 days
const REFRESH_TOKEN_EXPIRY = '30d'; // 30 days

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  status: string;
  membershipNumber?: string;
  profileImage?: string;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export class AuthService {
  /**
   * Generate access token
   */
  static async generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
    return await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(ACCESS_TOKEN_EXPIRY)
      .sign(JWT_SECRET);
  }

  /**
   * Generate refresh token
   */
  static async generateRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
    return await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(REFRESH_TOKEN_EXPIRY)
      .sign(JWT_SECRET);
  }

  /**
   * Verify JWT token
   */
  static async verifyToken(token: string): Promise<JWTPayload> {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      return payload as unknown as JWTPayload;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * Decode JWT token without verification (for getting payload from expired tokens)
   */
  static decodeToken(token: string): JWTPayload | null {
    try {
      return decodeJwt(token) as unknown as JWTPayload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Authenticate user with email and password
   */
  static async authenticateUser(credentials: LoginCredentials): Promise<AuthTokens> {
    const { email, password } = credentials;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        membershipNumber: true,
        profileImage: true,
      },
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    if (user.status === 'DEACTIVATED') {
      throw new Error('Account has been deactivated. Please contact admin.');
    }
    
    if (user.status !== 'ACTIVE') {
      throw new Error('Account is not active. Please contact admin.');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Generate tokens
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      userId: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      membershipNumber: user.membershipNumber || undefined,
      profileImage: user.profileImage || undefined,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(payload),
      this.generateRefreshToken(payload),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshAccessToken(refreshToken: string): Promise<string> {
    try {
      const payload = await this.verifyToken(refreshToken);
      
      // Generate new access token
      const newPayload: Omit<JWTPayload, 'iat' | 'exp'> = {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        firstName: payload.firstName,
        lastName: payload.lastName,
        status: payload.status,
        membershipNumber: payload.membershipNumber,
        profileImage: payload.profileImage,
      };

      return await this.generateAccessToken(newPayload);
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Get token from request (supports both cookies and headers)
   */
  static getTokenFromRequest(req: NextRequest): string | null {
    // First try to get from Authorization header (for mobile clients)
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Then try to get from cookies (for web clients)
    const token = req.cookies.get('access_token')?.value;
    return token || null;
  }

  /**
   * Set authentication cookies
   */
  static setAuthCookies(accessToken: string, refreshToken: string) {
    const cookieStore = cookies();
    
    // Set access token as HTTP-only cookie
    cookieStore.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: '/',
    });

    // Set refresh token as HTTP-only cookie
    cookieStore.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
      path: '/',
    });
  }

  /**
   * Clear authentication cookies
   */
  static clearAuthCookies() {
    const cookieStore = cookies();
    
    cookieStore.delete('access_token');
    cookieStore.delete('refresh_token');
  }

  /**
   * Get refresh token from cookies
   */
  static getRefreshTokenFromCookies(): string | null {
    const cookieStore = cookies();
    return cookieStore.get('refresh_token')?.value || null;
  }

  /**
   * Hash password
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password
   */
  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  /**
   * Generate membership number
   */
  static async generateMembershipNumber(): Promise<string> {
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      // Generate a random number between 1000 and 9999
      const randomNum = Math.floor(Math.random() * 9000) + 1000;
      const membershipNumber = `primo${randomNum}`;
      
      // Check if this membership number already exists
      const existingUser = await prisma.user.findUnique({
        where: { membershipNumber },
        select: { id: true }
      });
      
      if (!existingUser) {
        return membershipNumber;
      }
      
      attempts++;
    }
    
    // If we can't find a unique number after max attempts, use timestamp
    const timestamp = Date.now().toString().slice(-6);
    return `primo${timestamp}`;
  }
} 