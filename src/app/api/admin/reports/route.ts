import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'summary';

    if (type === 'summary') {
      // Get comprehensive summary stats
      const [
        totalUsers,
        totalApplications,
        approvedLoans,
        rejectedLoans,
        pendingReview,
        totalDisbursed,
        totalPayments,
        pendingKyc,
        recentApplications,
        monthlyStats,
      ] = await Promise.all([
        db.user.count({ where: { role: 'user' } }),
        db.loanApplication.count(),
        db.loanApplication.count({ where: { status: 'approved' } }),
        db.loanApplication.count({ where: { status: 'rejected' } }),
        db.loanApplication.count({ where: { status: 'submitted_for_review' } }),
        db.loanApplication.aggregate({
          where: { status: 'approved' },
          _sum: { loanAmount: true },
        }),
        db.payment.count(),
        db.kYC.count({ where: { status: 'pending' } }),
        db.loanApplication.findMany({
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: { fullName: true, email: true, phone: true },
            },
          },
        }),
        // Monthly application counts for the last 6 months
        getMonthlyStats(),
      ]);

      return NextResponse.json({
        summary: {
          totalUsers,
          totalApplications,
          approvedLoans,
          rejectedLoans,
          pendingReview,
          totalDisbursed: totalDisbursed._sum.loanAmount || 0,
          totalPayments,
          pendingKyc,
        },
        recentApplications,
        monthlyStats,
      });
    }

    if (type === 'users') {
      const users = await db.user.findMany({
        where: { role: 'user' },
        include: {
          kyc: { select: { status: true } },
          loanApps: { select: { id: true, status: true, loanAmount: true } },
          payments: { select: { id: true, amount: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json({ users });
    }

    if (type === 'loans') {
      const loans = await db.loanApplication.findMany({
        include: {
          user: {
            select: { fullName: true, email: true, phone: true },
          },
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json({ loans });
    }

    if (type === 'payments') {
      const payments = await db.payment.findMany({
        include: {
          user: {
            select: { fullName: true, email: true, phone: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json({ payments });
    }

    if (type === 'activity') {
      const logs = await db.activityLog.findMany({
        take: 100,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { fullName: true, email: true },
          },
        },
      });
      return NextResponse.json({ logs });
    }

    return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
  } catch (error) {
    console.error('Admin reports error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}

async function getMonthlyStats() {
  const months: { month: string; applications: number; approved: number; disbursed: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const start = new Date();
    start.setMonth(start.getMonth() - i);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    const [applications, approved] = await Promise.all([
      db.loanApplication.count({
        where: {
          createdAt: { gte: start, lt: end },
        },
      }),
      db.loanApplication.aggregate({
        where: {
          status: 'approved',
          createdAt: { gte: start, lt: end },
        },
        _sum: { loanAmount: true },
        _count: true,
      }),
    ]);

    months.push({
      month: start.toLocaleDateString('en-KE', { month: 'short', year: 'numeric' }),
      applications,
      approved: approved._count,
      disbursed: approved._sum.loanAmount || 0,
    });
  }

  return months;
}
