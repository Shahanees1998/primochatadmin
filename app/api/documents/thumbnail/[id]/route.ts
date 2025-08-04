import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDocumentThumbnailUrl } from '@/lib/cloudinary';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const document = await prisma.document.findUnique({
      where: { id: params.id },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Extract public_id from Cloudinary URL
    const urlParts = document?.fileUrl?.split('/');
    const publicId = urlParts?.[urlParts.length - 1].split('.')[0]; // Remove file extension
    
    // Generate thumbnail URL
    const thumbnailUrl = getDocumentThumbnailUrl(publicId ?? '', document.fileType ?? '');

    return NextResponse.json({
      thumbnailUrl,
      fileType: document.fileType,
      fileName: document.fileName,
    });
  } catch (error) {
    console.error('Document thumbnail error:', error);
    return NextResponse.json({ error: 'Failed to generate thumbnail URL' }, { status: 500 });
  }
} 