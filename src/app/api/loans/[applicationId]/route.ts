import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const user = await getUserFromRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { applicationId } = await params;

    const application = await db.loanApplication.findUnique({
      where: { id: applicationId },
      include: { payments: true },
    });

    if (!application) {
      return NextResponse.json({ error: 'Loan application not found' }, { status: 404 });
    }

    // Only allow the owner or admin to view the application
    if (application.userId !== user.userId && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ application });
  } catch (error) {
    console.error('Fetch application error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
