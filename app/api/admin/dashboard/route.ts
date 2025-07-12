import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        // Get all statistics in parallel for better performance
        const [
            totalUsers,
            pendingApprovals,
            activeEvents,
            supportRequests,
            documents,
            festiveBoards,
            recentActivity
        ] = await Promise.all([
            // Total users
            prisma.user.count(),
            
            // Pending approvals
            prisma.user.count({
                where: { status: 'PENDING' }
            }),
            
            // Active events (events that haven't ended yet)
            prisma.event.count({
                where: {
                    OR: [
                        { endDate: null },
                        { endDate: { gte: new Date() } }
                    ]
                }
            }),
            
            // Support requests
            prisma.supportRequest.count({
                where: { status: 'OPEN' }
            }),
            
            // Documents
            prisma.document.count(),
            
            // Festive boards
            prisma.festiveBoard.count(),
            
            // Recent activity (last 10 activities from various sources)
            Promise.all([
                // Recent user registrations
                prisma.user.findMany({
                    take: 3,
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        createdAt: true,
                        status: true
                    }
                }),
                
                // Recent events
                prisma.event.findMany({
                    take: 3,
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        title: true,
                        startDate: true,
                        createdAt: true
                    }
                }),
                
                // Recent support requests
                prisma.supportRequest.findMany({
                    take: 3,
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        subject: true,
                        status: true,
                        createdAt: true,
                        user: {
                            select: {
                                firstName: true,
                                lastName: true
                            }
                        }
                    }
                }),
                
                // Recent documents
                prisma.document.findMany({
                    take: 3,
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        title: true,
                        fileName: true,
                        createdAt: true,
                        user: {
                            select: {
                                firstName: true,
                                lastName: true
                            }
                        }
                    }
                })
            ])
        ]);

        // Process recent activity
        const allActivities = [
            ...recentActivity[0].map(user => ({
                id: user.id,
                type: 'USER_REGISTRATION',
                description: `New user registration: ${user.firstName} ${user.lastName}`,
                timestamp: user.createdAt.toISOString(),
                user: `${user.firstName} ${user.lastName}`,
                status: user.status
            })),
            ...recentActivity[1].map(event => ({
                id: event.id,
                type: 'EVENT_CREATED',
                description: `New event created: ${event.title}`,
                timestamp: event.createdAt.toISOString(),
                user: 'Admin',
                startDate: event.startDate
            })),
            ...recentActivity[2].map(request => ({
                id: request.id,
                type: 'SUPPORT_REQUEST',
                description: `New support request: ${request.subject}`,
                timestamp: request.createdAt.toISOString(),
                user: `${request.user.firstName} ${request.user.lastName}`,
                status: request.status
            })),
            ...recentActivity[3].map(doc => ({
                id: doc.id,
                type: 'DOCUMENT_UPLOADED',
                description: `Document uploaded: ${doc.title}`,
                timestamp: doc.createdAt.toISOString(),
                user: `${doc.user.firstName} ${doc.user.lastName}`
            }))
        ];

        // Sort by timestamp and take the most recent 10
        const sortedActivities = allActivities
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 10);

        // Get growth data for the last 6 months
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const monthlyStats = await Promise.all(
            Array.from({ length: 6 }, (_, i) => {
                const startDate = new Date();
                startDate.setMonth(startDate.getMonth() - (5 - i));
                startDate.setDate(1);
                startDate.setHours(0, 0, 0, 0);
                
                const endDate = new Date(startDate);
                endDate.setMonth(endDate.getMonth() + 1);
                endDate.setDate(0);
                endDate.setHours(23, 59, 59, 999);

                return Promise.all([
                    prisma.user.count({
                        where: {
                            createdAt: {
                                gte: startDate,
                                lte: endDate
                            }
                        }
                    }),
                    prisma.event.count({
                        where: {
                            createdAt: {
                                gte: startDate,
                                lte: endDate
                            }
                        }
                    })
                ]);
            })
        );

        const growthData = {
            labels: ['January', 'February', 'March', 'April', 'May', 'June'],
            newMembers: monthlyStats.map(([users]) => users),
            events: monthlyStats.map(([, events]) => events)
        };

        return NextResponse.json({
            stats: {
                totalUsers,
                pendingApprovals,
                activeEvents,
                supportRequests,
                documents,
                festiveBoards
            },
            recentActivity: sortedActivities,
            growthData
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        return NextResponse.json(
            { error: 'Failed to fetch dashboard data' },
            { status: 500 }
        );
    }
} 