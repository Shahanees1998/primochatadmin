import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const search = searchParams.get('search') || '';
        const category = searchParams.get('category') || '';
        const permissions = searchParams.get('permissions') || '';
        const sortField = searchParams.get('sortField') || 'createdAt';
        const sortOrder = searchParams.get('sortOrder') || '-1';

        const skip = (page - 1) * limit;

        // Build where clause
        const where: any = {};
        
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { fileName: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (category) {
            where.category = category;
        }

        if (permissions) {
            where.permissions = permissions;
        }

        // Build orderBy clause
        const orderBy: any = {};
        if (sortField === 'user.firstName') {
            orderBy.user = { firstName: sortOrder === '1' ? 'asc' : 'desc' };
        } else {
            orderBy[sortField] = sortOrder === '1' ? 'asc' : 'desc';
        }

        // Get documents with pagination
        const [documents, total] = await Promise.all([
            prisma.document.findMany({
                where,
                skip,
                take: limit,
                orderBy,
                include: {
                    user: {
                        select: {
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                },
            }),
            prisma.document.count({ where }),
        ]);

        return NextResponse.json({
            documents,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching documents:', error);
        return NextResponse.json(
            { error: 'Failed to fetch documents' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { title, description, fileName, fileUrl, fileType, fileSize, category, tags, permissions, uploadedBy } = body;

        // Validate required fields
        if (!title || !fileName || !fileUrl || !fileType || !category || !permissions) {
            return NextResponse.json(
                { error: 'Title, file name, file URL, file type, category, and permissions are required' },
                { status: 400 }
            );
        }

        // Get or create default admin user
        let adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' },
        });

        if (!adminUser) {
            // Create default admin user if none exists
            adminUser = await prisma.user.create({
                data: {
                    email: 'admin@primochat.com',
                    password: 'defaultPassword123', // This should be changed
                    firstName: 'Admin',
                    lastName: 'User',
                    role: 'ADMIN',
                    status: 'ACTIVE',
                },
            });
        }

        // Create new document
        const document = await prisma.document.create({
            data: {
                title,
                description,
                fileName,
                fileUrl,
                fileType,
                fileSize: parseInt(fileSize) || 0,
                category,
                tags: tags || [],
                permissions,
                uploadedBy: uploadedBy || adminUser.id,
            },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });

        return NextResponse.json(document, { status: 201 });
    } catch (error) {
        console.error('Error creating document:', error);
        return NextResponse.json(
            { error: 'Failed to create document' },
            { status: 500 }
        );
    }
} 