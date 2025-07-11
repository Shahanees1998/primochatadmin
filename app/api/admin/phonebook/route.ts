import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const search = searchParams.get('search') || '';
        const city = searchParams.get('city') || '';

        const skip = (page - 1) * limit;

        // Build where clause
        const where: any = {};
        
        if (search) {
            where.OR = [
                { user: { firstName: { contains: search, mode: 'insensitive' } } },
                { user: { lastName: { contains: search, mode: 'insensitive' } } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
            ];
        }

        // Get phone book entries with pagination
        const [phoneBookEntries, total] = await Promise.all([
            prisma.phoneBookEntry.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            firstName: true,
                            lastName: true,
                            email: true,
                            role: true,
                            status: true,
                        },
                    },
                },
            }),
            prisma.phoneBookEntry.count({ where }),
        ]);

        return NextResponse.json({
            phoneBookEntries,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching phone book entries:', error);
        return NextResponse.json(
            { error: 'Failed to fetch phone book entries' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { 
            userId,
            email, 
            phone, 
            address, 
            isPublic 
        } = body;

        // Validate required fields
        if (!userId || !email) {
            return NextResponse.json(
                { error: 'User ID and email are required' },
                { status: 400 }
            );
        }

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!existingUser) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Check if phone book entry already exists for this user
        const existingEntry = await prisma.phoneBookEntry.findUnique({
            where: { userId },
        });

        if (existingEntry) {
            return NextResponse.json(
                { error: 'Phone book entry for this user already exists' },
                { status: 400 }
            );
        }

        // Create new phone book entry
        const phoneBookEntry = await prisma.phoneBookEntry.create({
            data: {
                userId,
                email,
                phone,
                address,
                isPublic: isPublic !== undefined ? isPublic : true,
            },
            include: {
                user: {
                    select: {
                        role: true,
                        status: true,
                    },
                },
            },
        });

        return NextResponse.json(phoneBookEntry, { status: 201 });
    } catch (error) {
        console.error('Error creating phone book entry:', error);
        return NextResponse.json(
            { error: 'Failed to create phone book entry' },
            { status: 500 }
        );
    }
} 