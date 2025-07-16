import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth, AuthenticatedRequest } from '@/lib/authMiddleware';

export async function GET(request: NextRequest) {
    return withAdminAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
        try {

        // Get settings from database
        const settings = await prisma.systemSettings.findFirst();
        
        if (!settings) {
            // Return default settings if none exist
            return NextResponse.json({
                siteName: "PrimoChat Admin",
                siteDescription: "Administrative dashboard for PrimoChat community management",
                contactEmail: "admin@primochat.com",
                maxFileSize: 10,
                allowedFileTypes: "pdf,doc,docx,jpg,jpeg,png",
                defaultUserRole: "MEMBER",
                enableNotifications: true,
                enableChat: true,
                enableEvents: true,
                enableDocuments: true,
            });
        }

        return NextResponse.json(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
    });
}

export async function POST(request: NextRequest) {
    return withAdminAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
        try {

        const body = await request.json();
        
        // Validate required fields
        if (!body.siteName || !body.contactEmail) {
            return NextResponse.json({ error: 'Site name and contact email are required' }, { status: 400 });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(body.contactEmail)) {
            return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
        }

        // Validate file size
        if (body.maxFileSize < 1 || body.maxFileSize > 100) {
            return NextResponse.json({ error: 'File size must be between 1 and 100 MB' }, { status: 400 });
        }

        // Find existing settings or create new ones
        const existing = await prisma.systemSettings.findFirst();
        let settings;
        
        if (existing) {
            settings = await prisma.systemSettings.update({
                where: { id: existing.id },
                data: {
                    siteName: body.siteName,
                    siteDescription: body.siteDescription,
                    contactEmail: body.contactEmail,
                    maxFileSize: body.maxFileSize,
                    allowedFileTypes: body.allowedFileTypes,
                    enableNotifications: body.enableNotifications,
                    enableChat: body.enableChat,
                    enableEvents: body.enableEvents,
                    enableDocuments: body.enableDocuments,
                    updatedAt: new Date(),
                },
            });
        } else {
            settings = await prisma.systemSettings.create({
                data: {
                    siteName: body.siteName,
                    siteDescription: body.siteDescription,
                    contactEmail: body.contactEmail,
                    maxFileSize: body.maxFileSize,
                    allowedFileTypes: body.allowedFileTypes,
                    enableNotifications: body.enableNotifications,
                    enableChat: body.enableChat,
                    enableEvents: body.enableEvents,
                    enableDocuments: body.enableDocuments,
                },
            });
        }

        return NextResponse.json({ 
            message: 'Settings saved successfully',
            settings 
        });
    } catch (error) {
        console.error('Error saving settings:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
    });
} 