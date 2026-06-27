import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { userId, action, reason } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (!action || !['verify', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be either "verify" or "reject"' },
        { status: 400 }
      );
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

    // Update the KYC record
    const updatedKyc = await db.kYC.update({
      where: { userId },
      data: {
        status: newStatus,
        ...(action === 'verify' && { verifiedAt: new Date() }),
      },
    });

    // Create notification for the user
    const notificationTitle = action === 'verify'
      ? 'KYC Verification Approved'
      : 'KYC Verification Rejected';

    const notificationMessage = action === 'verify'
      ? 'Your identity verification has been approved. You can now apply for loans.'
      : `Your identity verification has been rejected.${reason ? ` Reason: ${reason}` : ''} Please resubmit your documents.`;

    await db.notification.create({
      data: {
        userId,
        title: notificationTitle,
        message: notificationMessage,
      },
    });

    return NextResponse.json({
      success: true,
      kyc: {
        id: updatedKyc.id,
        userId: updatedKyc.userId,
        status: updatedKyc.status,
        verifiedAt: updatedKyc.verifiedAt,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('KYC verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify KYC' },
      { status: 500 }
    );
  }
}
