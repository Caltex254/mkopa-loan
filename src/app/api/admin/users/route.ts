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

    // Parse pagination params
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    // Run the count and the page query in parallel — they're independent
    // and used to be sequential, doubling the latency of this endpoint.
    const [totalUsers, users] = await Promise.all([
      db.user.count(),
      db.user.findMany({
        select: {
          id: true,
          fullName: true,
          phone: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          kyc: {
            select: {
              id: true,
              status: true,
              verifiedAt: true,
              loanLimit: true,
            },
          },
          _count: {
            select: {
              loanApps: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const formattedUsers = users.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      phone: u.phone,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt,
      kycStatus: u.kyc?.status || 'not_submitted',
      kycVerifiedAt: u.kyc?.verifiedAt || null,
      // Loan limit set by admin during KYC verification (0 if no KYC or not yet verified)
      loanLimit: u.kyc?.loanLimit || 0,
      loanCount: u._count.loanApps,
    }));

    return NextResponse.json({
      users: formattedUsers,
      pagination: {
        page,
        limit,
        total: totalUsers,
        totalPages: Math.ceil(totalUsers / limit),
      },
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'private, max-age=5, stale-while-revalidate=15',
      },
    });
  } catch (error) {
    console.error('Admin users list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
