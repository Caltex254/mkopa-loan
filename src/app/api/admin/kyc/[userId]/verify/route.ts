import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
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

    const { userId } = await params;
    const body = await request.json();
    const { action, reason, loanLimit } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (!action || !['verify', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be either "verify" or "reject"' },
        { status: 400 }
      );
    }

    // When verifying, a loan limit MUST be provided by the admin
    if (action === 'verify') {
      const limit = Number(loanLimit);
      if (!loanLimit || isNaN(limit) || limit <= 0) {
        return NextResponse.json(
          { error: 'Loan limit is required when verifying KYC. Please provide a positive amount.' },
          { status: 400 }
        );
      }
    }

    // Find the KYC record
    const kyc = await db.kYC.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    if (!kyc) {
      return NextResponse.json(
        { error: 'KYC record not found for this user' },
        { status: 404 }
      );
    }

    // Check current status
    if (kyc.status !== 'pending') {
      return NextResponse.json(
        { error: `KYC cannot be reviewed in current status '${kyc.status}'. Expected 'pending'.` },
        { status: 400 }
      );
    }

    const newStatus = action === 'verify' ? 'verified' : 'rejected';

    // Update the KYC record (set loan limit when verifying)
    // Run the KYC update, notification creation, and activity-log creation
    // in PARALLEL rather than sequentially. These three writes hit different
    // tables and are independent — running them concurrently cuts the
    // total round-trip time from 3×RTT to 1×RTT, which is the single
    // biggest win for admin "verify KYC" latency.
    const [updatedKyc] = await Promise.all([
      db.kYC.update({
        where: { userId },
        data: {
          status: newStatus,
          ...(action === 'verify' && {
            verifiedAt: new Date(),
            loanLimit: Number(loanLimit),
          }),
        },
      }),
      db.notification.create({
        data: {
          userId,
          title: action === 'verify'
            ? 'KYC Verification Approved'
            : 'KYC Verification Rejected',
          message: action === 'verify'
            ? `Your identity verification has been approved. Your loan limit is KES ${Number(loanLimit).toLocaleString()}. You can now apply for loans up to this amount.`
            : `Your identity verification has been rejected.${reason ? ` Reason: ${reason}` : ''} Please resubmit your documents.`,
        },
      }),
      db.activityLog.create({
        data: {
          userId,
          action: action === 'verify' ? 'KYC_VERIFIED' : 'KYC_REJECTED',
          details: action === 'verify'
            ? `KYC verified by admin. Loan limit set to KES ${Number(loanLimit).toLocaleString()}.`
            : `KYC rejected by admin. Reason: ${reason || 'N/A'}`,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      kyc: updatedKyc,
    });
  } catch (error) {
    console.error('KYC verification error:', error);
    return NextResponse.json(
      { error: 'Failed to process KYC verification' },
      { status: 500 }
    );
  }
}
