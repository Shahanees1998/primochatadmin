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
        const documentType = searchParams.get('documentType') || '';
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
            where.categoryId = category;
        }

        if (documentType) {
            where.documentType = documentType;
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
                    category: {
                        select: {
                            id: true,
                            title: true,
                            description: true,
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
        const url = formData.get('url') as string;
        const title = formData.get('title') as string;
        const description = formData.get('description') as string;
        const categoryId = formData.get('categoryId') as string;
        const tags = formData.get('tags') as string;
        const permissions = formData.get('permissions') as string;
        const uploadedBy = formData.get('uploadedBy') as string;

        // Validate required fields
        if (!title || !permissions) {
            return NextResponse.json(
                { error: 'Title and permissions are required' },
                { status: 400 }
            );
        }

        // Check if either file or URL is provided
        if (!file && !url) {
            return NextResponse.json(
                { error: 'Either file or URL is required' },
                { status: 400 }
            );
        }

        // Get or create default admin user
        let adminUser = await prisma.user.findFirst({
            where: { role: 'MEMBER' },
        });

        if (!adminUser) {
            // Create default admin user if none exists
            adminUser = await prisma.user.create({
                data: {
                    email: 'admin@primochat.com',
                    password: 'defaultPassword123', // This should be changed
                    firstName: 'Admin',
                    lastName: 'User',
                    role: 'MEMBER',
                    status: 'ACTIVE',
                },
            });
        }

        let documentData: any = {
            title,
            description,
            tags: tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
            permissions: permissions as 'PUBLIC' | 'MEMBER_ONLY' | 'ADMIN_ONLY',
        };

        // Add category connection if categoryId is provided
        if (categoryId) {
            documentData.category = {
                connect: {
                    id: categoryId
                }
            };
        }

        // Handle file upload
        if (file) {
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

            // Upload file to Cloudinary
            const cloudinaryResult = await uploadToCloudinary(file, {
                folder: 'primochat/documents',
                resource_type: 'auto',
                max_bytes: 50 * 1024 * 1024 // 50MB
            });

            // Auto-determine document type based on file type
            let autoDocumentType = 'DOCUMENT';
            if (file.type === 'application/pdf') {
                autoDocumentType = 'PDF';
            } else if (file.type.startsWith('image/')) {
                autoDocumentType = 'IMAGE';
            } else if (file.type.includes('word') || file.type.includes('document')) {
                autoDocumentType = 'DOCUMENT';
            } else if (file.type.includes('excel') || file.type.includes('spreadsheet')) {
                autoDocumentType = 'SPREADSHEET';
            } else if (file.type.includes('powerpoint') || file.type.includes('presentation')) {
                autoDocumentType = 'PRESENTATION';
            } else if (file.type === 'text/plain') {
                autoDocumentType = 'TEXT';
            }

            documentData = {
                ...documentData,
                fileName: file.name,
                fileUrl: cloudinaryResult.secure_url,
                filePublicId: cloudinaryResult.public_id,
                fileType: file.type,
                fileSize: file.size,
                documentType: autoDocumentType,
            };
        }

        // Handle URL input
        if (url) {
            // Validate URL
            try {
                new URL(url);
            } catch {
                return NextResponse.json(
                    { error: 'Invalid URL format' },
                    { status: 400 }
                );
            }

            // Auto-determine document type based on URL
            let autoDocumentType = 'LINK';
            if (url.toLowerCase().includes('.pdf')) {
                autoDocumentType = 'PDF';
            } else if (url.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) {
                autoDocumentType = 'IMAGE';
            } else if (url.toLowerCase().match(/\.(doc|docx)$/)) {
                autoDocumentType = 'DOCUMENT';
            } else if (url.toLowerCase().match(/\.(xls|xlsx)$/)) {
                autoDocumentType = 'SPREADSHEET';
            } else if (url.toLowerCase().match(/\.(ppt|pptx)$/)) {
                autoDocumentType = 'PRESENTATION';
            } else if (url.toLowerCase().match(/\.(txt)$/)) {
                autoDocumentType = 'TEXT';
            }

            documentData = {
                ...documentData,
                fileName: url.split('/').pop() || 'External Link',
                fileUrl: url,
                filePublicId: null,
                fileType: 'url',
                fileSize: 0,
                documentType: autoDocumentType,
            };
        }

        const document = await prisma.document.create({
            data: {
                ...documentData,
                user: {
                    connect: {
                        id: adminUser.id
                    }
                }
            },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                category: {
                    select: {
                        id: true,
                        title: true,
                        description: true,
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