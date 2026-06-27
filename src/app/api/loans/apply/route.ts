import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { calculateLoan } from '@/lib/loans';

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { loanAmount } = body;

    if (!loanAmount) {
      return NextResponse.json({ error: 'loanAmount is required' }, { status: 400 });
    }

    // Verify user has completed KYC with status "verified"
    const kyc = await db.kYC.findUnique({
      where: { userId: user.userId },
    });

    if (!kyc || kyc.status !== 'verified') {
      return NextResponse.json(
        { error: 'KYC verification must be completed before applying for a loan' },
        { status: 400 }
      );
    }

    // Enforce admin-set loan limit
    const adminLoanLimit = kyc.loanLimit || 0;
    if (adminLoanLimit <= 0) {
      return NextResponse.json(
        { error: 'Your loan limit has not been set yet. Please wait for admin to assign your loan limit after KYC verification.' },
        { status: 400 }
      );
    }
    if (Number(loanAmount) > adminLoanLimit) {
      return NextResponse.json(
        { error: `Your requested amount of KES ${Number(loanAmount).toLocaleString()} exceeds your approved loan limit of KES ${adminLoanLimit.toLocaleString()}. Please apply for an amount within your limit.` },
        { status: 400 }
      );
    }

    // Calculate loan details
    const loanDetails = calculateLoan(Number(loanAmount));
    if (!loanDetails) {
      return NextResponse.json(
        { error: 'Invalid loan amount. Please select a valid loan product.' },
        { status: 400 }
      );
    }

    // Create loan application — goes directly to pending_activation (no admin review needed)
    // After KYC verification, user pays activation fee immediately to activate the loan
    const application = await db.loanApplication.create({
      data: {
        userId: user.userId,
        loanAmount: loanDetails.loanAmount,
        processingFee: loanDetails.processingFee,
        amountReceived: loanDetails.amountReceived,
        totalRepayment: loanDetails.totalRepayment,
        repaymentDate: loanDetails.repaymentDate,
        status: 'pending_activation',
      },
    });

    // Create activity log entry
    await db.activityLog.create({
      data: {
        userId: user.userId,
        action: 'LOAN_APPLICATION_CREATED',
        details: `Loan application submitted for KES ${loanDetails.loanAmount}. Activation fee of KES ${loanDetails.activationFee} required to activate.`,
      },
    });

    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    console.error('Loan application error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
