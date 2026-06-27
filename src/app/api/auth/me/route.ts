import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Get user from token
    const tokenData = await getUserFromRequest();

    if (!tokenData) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Find user with KYC status
    const user = await db.user.findUnique({
      where: { id: tokenData.userId },
      include: {
        kyc: {
          select: {
            id: true,
            status: true,
            legalName: true,
            nationalId: true,
            verifiedAt: true,
            loanLimit: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account is deactivated' },
        { status: 403 }
      );
    }

    // Prepare user data without password
    const userData = {
      id: user.id,
      fullName: user.fullName,
      phone: user.phone,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      kycStatus: user.kyc?.status || null,
      loanLimit: user.kyc?.loanLimit || 0,
      kyc: user.kyc
        ? {
            status: user.kyc.status,
            legalName: user.kyc.legalName,
            nationalId: user.kyc.nationalId,
            verifiedAt: user.kyc.verifiedAt,
            loanLimit: user.kyc.loanLimit,
          }
        : null,
      createdAt: user.createdAt,
    };

    return NextResponse.json(
      {
        user: userData,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json(
      { error: 'Internal server error. Please try again later.' },
      { status: 500 }
    );
  }
}
