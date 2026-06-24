import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Webhook endpoint for Xdigitex Pay to notify us of payment status changes
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('Payment webhook received:', JSON.stringify(body, null, 2));

    const { reference, status, amount } = body;

    if (!reference) {
      return NextResponse.json({ error: 'Reference is required' }, { status: 400 });
    }

    // Find the payment by reference
    const payment = await db.payment.findFirst({
      where: { transactionId: reference },
    });

    if (!payment) {
      console.error('Payment not found for reference:', reference);
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Map Xdigitex status to our status
    let newStatus = payment.status;
    if (status === 'completed' || status === 'success') {
      newStatus = 'completed';
    } else if (status === 'failed' || status === 'rejected') {
      newStatus = 'failed';
    } else if (status === 'pending' || status === 'processing') {
      newStatus = 'processing';
    }

    // Update payment status
    if (newStatus !== payment.status) {
      await db.payment.update({
        where: { id: payment.id },
        data: { status: newStatus },
      });

      // If payment completed, update loan application
      if (newStatus === 'completed' && payment.applicationId) {
        await db.loanApplication.update({
          where: { id: payment.applicationId },
          data: {
            activationPaid: true,
            activationRef: payment.transactionId,
            paymentRef: payment.paymentRef,
            status: 'submitted_for_review',
          },
        });

        // Create notification
        await db.notification.create({
          data: {
            userId: payment.userId,
            title: 'Activation Fee Paid',
            message: `Your activation fee of KES ${payment.amount} has been received. Your loan application is now submitted for review.`,
          },
        });

        // Create activity log
        await db.activityLog.create({
          data: {
            userId: payment.userId,
            action: 'ACTIVATION_FEE_PAID',
            details: `Paid activation fee of KES ${payment.amount} via webhook. Transaction: ${payment.transactionId}`,
          },
        });
      }
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error) {
    console.error('Payment webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// GET handler for callback redirect
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const reference = searchParams.get('reference');
  const status = searchParams.get('status');

  // Redirect back to the app with status info
  const redirectUrl = `/api/payments/status?reference=${reference || ''}`;
  return NextResponse.redirect(new URL(redirectUrl, request.url));
}
