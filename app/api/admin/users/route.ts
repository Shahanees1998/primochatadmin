import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { withAdminAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { AuthService } from '@/lib/auth';

export async function GET(request: NextRequest) {
  return withAdminAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const search = searchParams.get('search') || '';
        const status = searchParams.get('status') || '';
        const sortField = searchParams.get('sortField');
        const sortOrder = searchParams.get('sortOrder');

        const skip = (page - 1) * limit;

        // Build where clause
        const where: any = {};
        
        if (search) {
            where.OR = [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { membershipNumber: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (status) {
            where.status = status;
        }

        // Build orderBy clause
        let orderBy: any = { createdAt: 'desc' };
        if (sortField) {
            orderBy = {};
            // sortOrder: 1 = asc, -1 = desc
            orderBy[sortField] = sortOrder === '1' ? 'asc' : 'desc';
        }

        // Get users with pagination
        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy,
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                    role: true,
                    status: true,
                    profileImage: true,
                    membershipNumber: true,
                    joinDate: true,
                    paidDate: true,
                    lastLogin: true,
                    createdAt: true,
                },
            }),
            prisma.user.count({ where }),
        ]);
        return NextResponse.json({
            users,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json(
            { error: 'Failed to fetch users' },
            { status: 500 }
        );
    }
  });
}

export async function POST(request: NextRequest) {
  return withAdminAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
        const body = await request.json();
        const { firstName, lastName, email, phone, joinDate, password, paidDate, status } = body;

        // Validate required fields
        if (!firstName || !lastName || !email) {
            return NextResponse.json(
                { error: 'First name, last name, and email are required' },
                { status: 400 }
            );
        }

        // Check if email already exists
        const existingUserByEmail = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUserByEmail) {
            return NextResponse.json(
                { error: 'Email already exists' },
                { status: 400 }
            );
        }

                // Generate membership number automatically with retry logic
        let attempts = 0;
        const maxAttempts = 5;
        
        while (attempts < maxAttempts) {
            try {
                const membershipNumber = await AuthService.generateMembershipNumber();
                
                // Hash the password (admin can set, or use default)
                const plainPassword = password || 'defaultPassword123';
                const hashedPassword = await bcrypt.hash(plainPassword, 10);

                // Create new user with hashed password and phonebook entry
                const user = await prisma.user.create({
                    data: {
                        firstName,
                        lastName,
                        email,
                        password: hashedPassword,
                        phone,
                        role: 'MEMBER',
                        status: status || 'PENDING',
                        membershipNumber,
                        joinDate: joinDate ? new Date(joinDate) : null,
                        paidDate: paidDate ? new Date(paidDate) : null,
                        phoneBookEntry: {
                            create: {
                                email,
                                phone: phone || null,
                                isPublic: true,
                            },
                        },
                    },
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                        role: true,
                        status: true,
                        profileImage: true,
                        membershipNumber: true,
                        joinDate: true,
                        paidDate: true,
                        lastLogin: true,
                        createdAt: true,
                    },
                });

                return NextResponse.json(user, { status: 201 });
            } catch (error: any) {
                // If it's a unique constraint error for membership number, retry
                if (error.code === 'P2002' && error.meta?.target?.includes('membershipNumber')) {
                    attempts++;
                    if (attempts >= maxAttempts) {
                        console.error('Failed to generate unique membership number after', maxAttempts, 'attempts');
                        return NextResponse.json(
                            { error: 'Failed to create user: Unable to generate unique membership number' },
                            { status: 500 }
                        );
                    }
                    // Continue to next attempt
                    continue;
                }
                // For other errors, throw immediately
                throw error;
            }
        }
        
        // This should never be reached, but TypeScript requires it
        return NextResponse.json(
            { error: 'Failed to create user after maximum attempts' },
            { status: 500 }
        );
    } catch (error) {
        console.error('Error creating user:', error);
        return NextResponse.json(
            { error: 'Failed to create user' },
            { status: 500 }
        );
    }
  });
} 