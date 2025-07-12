import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const search = searchParams.get('search') || '';
        const isFlagged = searchParams.get('isFlagged') || '';
        const isModerated = searchParams.get('isModerated') || '';
        const sortField = searchParams.get('sortField') || 'createdAt';
        const sortOrder = searchParams.get('sortOrder') || 'desc';

        const skip = (page - 1) * limit;

        // Build where clause
        const where: any = {};
        if (search) {
            where.OR = [
                { content: { contains: search, mode: 'insensitive' } },
                { sender: { firstName: { contains: search, mode: 'insensitive' } } },
                { sender: { lastName: { contains: search, mode: 'insensitive' } } },
            ];
        }
        if (isFlagged !== '') {
            where.isFlagged = isFlagged === 'true';
        }
        if (isModerated !== '') {
            where.isModerated = isModerated === 'true';
        }

        // Only show flagged messages by default
        if (isFlagged === '') {
            where.isFlagged = true;
        }

        // Build orderBy clause
        let orderBy: any = {};
        if (sortField === 'sender.firstName' || sortField === 'sender.lastName') {
            orderBy.sender = { [sortField.split('.')[1]]: sortOrder === 'asc' ? 'asc' : 'desc' };
        } else {
            orderBy[sortField] = sortOrder === 'asc' ? 'asc' : 'desc';
        }

        // Get flagged messages with pagination
        const [messages, total] = await Promise.all([
            prisma.message.findMany({
                where,
                skip,
                take: limit,
                orderBy,
                include: {
                    sender: {
                        select: {
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                },
            }),
            prisma.message.count({ where }),
        ]);

        return NextResponse.json({
            messages,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching flagged messages:', error);
        return NextResponse.json(
            { error: 'Failed to fetch flagged messages' },
            { status: 500 }
        );
    }
} 