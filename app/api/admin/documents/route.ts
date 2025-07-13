import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadToCloudinary, validateFile } from '@/lib/cloudinary';

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
        let formData;
        try {
            formData = await request.formData();
        } catch (error) {
            console.error('Error creating FormData:', error);
            return NextResponse.json(
                { error: 'Invalid request format. Expected multipart/form-data' },
                { status: 400 }
            );
        }

        const fileData = formData.get('file');
        const file = fileData as File;
        const title = formData.get('title') as string;
        const description = formData.get('description') as string;
        const category = formData.get('category') as string;
        const tags = formData.get('tags') as string;
        const permissions = formData.get('permissions') as string;
        const uploadedBy = formData.get('uploadedBy') as string;
        // Validate required fields
        if (!file || !title || !category || !permissions) {
            return NextResponse.json(
                { error: 'File, title, category, and permissions are required' },
                { status: 400 }
            );
        }

        // Validate file
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain',
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp'
        ];

        const validation = validateFile(file, {
            allowedTypes,
            maxSize: 50 * 1024 * 1024 // 50MB
        });
        if (!validation.isValid) {
            return NextResponse.json(
                { error: validation.error },
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

        // Upload file to Cloudinary
        const cloudinaryResult = await uploadToCloudinary(file, {
            folder: 'primochat/documents',
            resource_type: 'auto',
            max_bytes: 50 * 1024 * 1024 // 50MB
        });
        // Parse tags
        const tagsArray = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
        const data = {
            title,
            description,
            fileName: file.name,
            fileUrl: cloudinaryResult.secure_url,
            filePublicId: cloudinaryResult.public_id, // Store the full public_id
            fileType: file.type,
            fileSize: file.size,
            category,
            tags: tagsArray,
            permissions: permissions as 'PUBLIC' | 'MEMBER_ONLY' | 'ADMIN_ONLY',
            uploadedBy: uploadedBy || adminUser.id,
        }
        const document = await prisma.document.create({
            data,
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