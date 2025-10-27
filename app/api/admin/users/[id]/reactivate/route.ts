import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth, AuthenticatedRequest } from '@/lib/authMiddleware';

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    return withAdminAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
        try {
            // Check if user exists
            const existingUser = await prisma.user.findUnique({
                where: { id: params.id },
            });

            if (!existingUser) {
                return NextResponse.json(
                    { error: 'Member not found' },
                    { status: 404 }
                );
            }

            // Check if user is actually deleted
            if (!(existingUser as any).isDeleted) {
                return NextResponse.json(
                    { error: 'Member is not deleted' },
                    { status: 400 }
                );
            }

            // Reactivate user: set isDeleted to false and status to ACTIVE
            const reactivatedUser = await prisma.user.update({
                where: { id: params.id },
                data: {
                    isDeleted: false,
                    status: 'ACTIVE',
                },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                    role: true,
                    status: true,
                    isDeleted: true,
                    profileImage: true,
                    profileImagePublicId: true,
                    membershipNumber: true,
                    joinDate: true,
                    paidDate: true,
                    lastLogin: true,
                    createdAt: true,
                },
            });

            return NextResponse.json(
                { 
                    message: 'Member reactivated successfully',
                    user: reactivatedUser 
                },
                { status: 200 }
            );
        } catch (error) {
            console.error('Error reactivating member:', error);
            return NextResponse.json(
                { error: 'Failed to reactivate member' },
                { status: 500 }
            );
        }
    });
}




