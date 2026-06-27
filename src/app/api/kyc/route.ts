import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { legalName, nationalId, idFrontImage, idBackImage, residentialAddress, dateOfBirth } = body;

    // Validate required fields
    if (!legalName || !nationalId || !idFrontImage || !idBackImage || !residentialAddress || !dateOfBirth) {
      return NextResponse.json(
        { error: 'All fields are required: legalName, nationalId, idFrontImage, idBackImage, residentialAddress, dateOfBirth' },
        { status: 400 }
      );
    }

    // Check if KYC already exists for this user
    const existingKYC = await db.kYC.findUnique({
      where: { userId: user.userId },
    });

    let kyc;

    if (existingKYC) {
      // Update existing KYC record
      kyc = await db.kYC.update({
        where: { userId: user.userId },
        data: {
          legalName,
          nationalId,
          idFrontImage,
          idBackImage,
          residentialAddress,
          dateOfBirth,
          status: 'pending',
          verifiedAt: null,
        },
      });
    } else {
      // Create new KYC record
      kyc = await db.kYC.create({
        data: {
          userId: user.userId,
          legalName,
          nationalId,
          idFrontImage,
          idBackImage,
          residentialAddress,
          dateOfBirth,
          status: 'pending',
        },
      });
    }

    // Create activity log entry
    await db.activityLog.create({
      data: {
        userId: user.userId,
        action: existingKYC ? 'KYC_UPDATED' : 'KYC_SUBMITTED',
        details: `KYC verification ${existingKYC ? 'updated' : 'submitted'} for ${legalName}`,
      },
    });

    return NextResponse.json({ kyc }, { status: existingKYC ? 200 : 201 });
  } catch (error) {
    console.error('KYC submission error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
