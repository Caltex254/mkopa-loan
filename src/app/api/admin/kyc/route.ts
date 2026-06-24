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

    // Parse query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;

    // Build where clause
    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }

    // Get KYC records with user info.
    // PERF CRITICAL: idFrontImage / idBackImage are intentionally OMITTED.
    // They are base64-encoded ID-card photos (often 1-5 MB each). With 11
    // KYC records the inline response was ~55 MB, which caused this endpoint
    // to time out (>30s) through Cloudflare Tunnel. The admin dashboard's
    // detail dialog fetches each image on demand via the existing
    // /api/admin/kyc-download/[kycId]?side=front|back endpoint (which is
    // also what the Download button already uses), so we don't need the
    // image bytes here. List response drops from ~55 MB to a few KB.
    const records = await db.kYC.findMany({
      where,
      select: {
        id: true,
        userId: true,
        legalName: true,
        nationalId: true,
        residentialAddress: true,
        dateOfBirth: true,
        status: true,
        loanLimit: true,
        verifiedAt: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ records }, {
      status: 200,
      headers: {
        // Short browser cache so the admin KYC list doesn't refetch on
        // every tab switch; stale-while-revalidate keeps it fresh.
        'Cache-Control': 'private, max-age=5, stale-while-revalidate=15',
      },
    });
  } catch (error) {
    console.error('Admin KYC list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch KYC records' },
      { status: 500 }
    );
  }
}
