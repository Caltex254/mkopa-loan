import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET() {
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

    // Run all count queries in parallel
    const [
      totalUsers,
      totalApplications,
      pendingKYC,
      pendingActivation,
      approvedLoans,
      rejectedLoans,
      approvedLoanData,
    ] = await Promise.all([
      db.user.count(),
      db.loanApplication.count(),
      db.kYC.count({ where: { status: 'pending' } }),
      db.loanApplication.count({ where: { status: 'pending_activation' } }),
      db.loanApplication.count({ where: { status: 'approved' } }),
      db.loanApplication.count({ where: { status: 'rejected' } }),
      db.loanApplication.findMany({
        where: { status: 'approved' },
        select: { loanAmount: true },
      }),
    ]);

    // Calculate total disbursed amount
    const totalDisbursed = approvedLoanData.reduce(
      (sum, app) => sum + app.loanAmount,
      0
    );

    return NextResponse.json({
      totalUsers,
      totalApplications,
      pendingKYC,
      pendingReview: pendingActivation, // Map to existing field name for the dashboard
      pendingActivation,
      approvedLoans,
      rejectedLoans,
      totalDisbursed,
    }, {
      status: 200,
      headers: {
        // Admin stats change slowly — let the browser reuse the cached
        // response for 10s and refresh in the background. Cuts redundant
        // DB hits when admin navigates between dashboard tabs.
        'Cache-Control': 'private, max-age=10, stale-while-revalidate=30',
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin stats' },
      { status: 500 }
    );
  }
}
