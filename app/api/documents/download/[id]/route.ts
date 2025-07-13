import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDocumentDownloadUrl } from '@/lib/cloudinary';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const document = await prisma.document.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Extract public_id from Cloudinary URL
    const urlParts = document.fileUrl.split('/');
    const publicId = urlParts[urlParts.length - 1].split('.')[0]; // Remove file extension
    
    // Generate download URL with attachment flag
    const downloadUrl = getDocumentDownloadUrl(publicId);

    return NextResponse.json({
      downloadUrl,
      document: {
        id: document.id,
        title: document.title,
        fileName: document.fileName,
        fileType: document.fileType,
        fileSize: document.fileSize,
        uploadedBy: document.user,
        createdAt: document.createdAt,
      },
    });
  } catch (error) {
    console.error('Document download error:', error);
    return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 });
  }
} 