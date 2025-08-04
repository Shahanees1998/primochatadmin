import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/authMiddleware';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  return withAuth(request, async (authenticatedReq: AuthenticatedRequest) => {
    try {
      // Check if user is admin
      // if (authenticatedReq.user?.role !== 'ADMIN') {
      //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      // }

      // Get dashboard statistics
      const [
        totalUsers,
        pendingApprovals,
        activeTrestleBoards,
        activeFestiveBoards,
        supportRequests,
        documents,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { status: 'PENDING' } }),
        prisma.trestleBoard.count({
          where: {
            date: {
              gte: new Date(),
            },
          },
        }),
        prisma.festiveBoard.count({
          where: {
            year: new Date().getFullYear(),
          },
        }),
        prisma.supportRequest.count({ where: { status: 'OPEN' } }),
        prisma.document.count(),
      ]);

      // Get recent activity
      const recentActivity = await prisma.user.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          createdAt: true,
          status: true,
        },
      });

      // Transform recent activity
      const transformedActivity = recentActivity.map((user) => ({
        id: user.id,
        type: 'USER_REGISTRATION',
        description: `New user registration: ${user.firstName} ${user.lastName}`,
        timestamp: user.createdAt.toISOString(),
        user: user.email,
        status: user.status,
      }));

      // Get growth data for the last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const monthlyData = [];
      const labels = [];

      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        const [newMembers, trestleBoards, festiveBoards] = await Promise.all([
          prisma.user.count({
            where: {
              createdAt: {
                gte: monthStart,
                lte: monthEnd,
              },
            },
          }),
          prisma.trestleBoard.count({
            where: {
              createdAt: {
                gte: monthStart,
                lte: monthEnd,
              },
            },
          }),
          prisma.festiveBoard.count({
            where: {
              createdAt: {
                gte: monthStart,
                lte: monthEnd,
              },
            },
          }),
        ]);

        monthlyData.push({ newMembers, trestleBoards, festiveBoards });
        labels.push(date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
      }

      const growthData = {
        labels,
        newMembers: monthlyData.map(d => d.newMembers),
        trestleBoards: monthlyData.map(d => d.trestleBoards),
        festiveBoards: monthlyData.map(d => d.festiveBoards),
      };

      return NextResponse.json({
        stats: {
          totalUsers,
          pendingApprovals,
          activeTrestleBoards,
          activeFestiveBoards,
          supportRequests,
          documents,
        },
        recentActivity: transformedActivity,
        growthData,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      return NextResponse.json(
        { error: 'Failed to fetch dashboard data' },
        { status: 500 }
      );
    }
  });
} 