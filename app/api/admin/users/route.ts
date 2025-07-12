import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const search = searchParams.get('search') || '';
        const role = searchParams.get('role') || '';
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

        if (role) {
            where.role = role;
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
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { firstName, lastName, email, phone, role, status, membershipNumber, joinDate, password } = body;

        // Validate required fields
        if (!firstName || !lastName || !email) {
            return NextResponse.json(
                { error: 'First name, last name, and email are required' },
                { status: 400 }
            );
        }

        // Check if email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: 'Email already exists' },
                { status: 400 }
            );
        }

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
                role: role || 'MEMBER',
                status: status || 'PENDING',
                membershipNumber,
                joinDate: joinDate ? new Date(joinDate) : null,
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
                lastLogin: true,
                createdAt: true,
            },
        });

        return NextResponse.json(user, { status: 201 });
    } catch (error) {
        console.error('Error creating user:', error);
        return NextResponse.json(
            { error: 'Failed to create user' },
            { status: 500 }
        );
    }
} 