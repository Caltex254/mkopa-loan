import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
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

    const { applicationId } = await params;
    const body = await request.json();
    const { action, reason } = body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be either "approve" or "reject"' },
        { status: 400 }
      );
    }

    // Find the application
    const application = await db.loanApplication.findUnique({
      where: { id: applicationId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: 'Loan application not found' },
        { status: 404 }
      );
    }

    // Allow admin to reject any active loan (pending_activation, pending_review, etc.)
    // Approve is no longer needed since loans auto-activate after the user pays the activation fee
    const activeStatuses = ['submitted_for_review', 'pending_activation', 'pending_review'];
    if (!activeStatuses.includes(application.status)) {
      return NextResponse.json(
        { error: `Application cannot be reviewed in current status '${application.status}'. Expected one of: ${activeStatuses.join(', ')}.` },
        { status: 400 }
      );
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // Update the application
    const updatedApplication = await db.loanApplication.update({
      where: { id: applicationId },
      data: {
        status: newStatus,
        reviewedAt: new Date(),
      },
    });

    // Create notification for the user
    const notificationTitle = action === 'approve'
      ? 'Loan Application Approved'
      : 'Loan Application Rejected';

    const notificationMessage = action === 'approve'
      ? `Congratulations! Your loan application for KES ${application.loanAmount.toLocaleString()} has been approved.`
      : `Your loan application for KES ${application.loanAmount.toLocaleString()} has been rejected.${reason ? ` Reason: ${reason}` : ''}`;

    await db.notification.create({
      data: {
        userId: application.userId,
        title: notificationTitle,
        message: notificationMessage,
      },
    });

    // Create activity log
    await db.activityLog.create({
      data: {
        userId: user.userId,
        action: action === 'approve' ? 'LOAN_APPLICATION_APPROVED' : 'LOAN_APPLICATION_REJECTED',
        details: `Admin ${action === 'approve' ? 'approved' : 'rejected'} loan application ${applicationId} for user ${application.user.fullName}.${reason ? ` Reason: ${reason}` : ''}`,
      },
    });

    return NextResponse.json({
      success: true,
      application: {
        id: updatedApplication.id,
        status: updatedApplication.status,
        reviewedAt: updatedApplication.reviewedAt,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Application review error:', error);
    return NextResponse.json(
      { error: 'Failed to review application' },
      { status: 500 }
    );
  }
}
