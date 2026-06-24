import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest, hashPassword, comparePassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from token
    const tokenData = await getUserFromRequest();
    if (!tokenData) {
      return NextResponse.json(
        { error: 'Not authenticated. Please log in again.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    // Validate all fields are present
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: 'All fields are required: current password, new password, and confirm password' },
        { status: 400 }
      );
    }

    // Validate new password length
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Validate new password matches confirm
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: 'New password and confirm password do not match' },
        { status: 400 }
      );
    }

    // New password must be different from current
    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: 'New password must be different from your current password' },
        { status: 400 }
      );
    }

    // Find user in database
    const user = await db.user.findUnique({
      where: { id: tokenData.userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account is deactivated. Please contact support.' },
        { status: 403 }
      );
    }

    // Verify current password
    const isCurrentPasswordValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update user password
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    });

    // Create activity log
    await db.activityLog.create({
      data: {
        userId: user.id,
        action: 'PASSWORD_CHANGED',
        details: 'User changed their password successfully',
      },
    });

    // Create notification
    await db.notification.create({
      data: {
        userId: user.id,
        title: 'Password Changed',
        message: 'Your account password was changed successfully. If you did not make this change, please contact support immediately.',
      },
    });

    return NextResponse.json(
      { message: 'Password changed successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: 'Failed to change password. Please try again later.' },
      { status: 500 }
    );
  }
}
