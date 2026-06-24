import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const user = await getUserFromRequest();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userId } = await params;

    const targetUser = await db.user.findUnique({
      where: { id: userId },
      include: {
        kyc: true,
        loanApps: {
          orderBy: { createdAt: 'desc' },
          include: { payments: true },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        notifications: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        activityLogs: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Remove password hash from response
    const { passwordHash: _, ...safeUser } = targetUser;

    return NextResponse.json({ user: safeUser });
  } catch (error) {
    console.error('Admin user detail error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const user = await getUserFromRequest();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userId } = await params;
    const body = await request.json();
    const { isActive } = body;

    if (typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'isActive must be a boolean' },
        { status: 400 }
      );
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: { isActive },
    });

    // Log the action
    await db.activityLog.create({
      data: {
        userId: user.userId,
        action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
        details: `User ${updatedUser.fullName} (${updatedUser.email}) was ${isActive ? 'activated' : 'deactivated'}`,
      },
    });

    // Notify the user
    await db.notification.create({
      data: {
        userId,
        title: isActive ? 'Account Activated' : 'Account Deactivated',
        message: isActive
          ? 'Your account has been activated. You can now access all features.'
          : 'Your account has been deactivated. Please contact support for assistance.',
      },
    });

    const { passwordHash: _, ...safeUser } = updatedUser;

    return NextResponse.json({ user: safeUser });
  } catch (error) {
    console.error('Admin user update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
