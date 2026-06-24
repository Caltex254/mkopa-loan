import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

function getPaymentConfig() {
  const apiKey = process.env.PAYMENT_API_KEY || '';
  const baseUrl = process.env.PAYMENT_BASE_URL || 'https://pay.xdigitex.space/api';
  return { apiKey, baseUrl };
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('reference');
    const paymentId = searchParams.get('paymentId');

    if (!reference && !paymentId) {
      return NextResponse.json(
        { error: 'Reference or payment ID is required' },
        { status: 400 }
      );
    }

    // Find the payment in our database
    let payment;
    if (paymentId) {
      payment = await db.payment.findUnique({ where: { id: paymentId } });
    } else if (reference) {
      payment = await db.payment.findFirst({
        where: { transactionId: reference },
      });
    }

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (payment.userId !== user.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // If payment is still processing, check with Xdigitex API for update
    if (payment.status === 'processing' || payment.status === 'pending') {
      try {
        const { apiKey: statusApiKey, baseUrl: statusBaseUrl } = getPaymentConfig();
        const statusResponse = await fetch(
          `${statusBaseUrl}/payments/${payment.transactionId}/status`,
          {
            headers: {
              'X-API-Key': statusApiKey,
            },
          }
        );

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          const xdigitexStatus = statusData.status;

          // Map Xdigitex status to our status
          let newStatus = payment.status;
          if (xdigitexStatus === 'completed' || xdigitexStatus === 'success') {
            newStatus = 'completed';
          } else if (xdigitexStatus === 'failed' || xdigitexStatus === 'rejected') {
            newStatus = 'failed';
          } else if (xdigitexStatus === 'pending' || xdigitexStatus === 'processing') {
            newStatus = 'processing';
          }

          // Update payment status if changed
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
                  userId: user.userId,
                  title: 'Activation Fee Paid',
                  message: `Your activation fee of KES ${payment.amount} has been received. Your loan application is now submitted for review.`,
                },
              });

              // Create activity log
              await db.activityLog.create({
                data: {
                  userId: user.userId,
                  action: 'ACTIVATION_FEE_PAID',
                  details: `Paid activation fee of KES ${payment.amount}. Transaction: ${payment.transactionId}`,
                },
              });
            }

            payment.status = newStatus;
          }
        }
      } catch (error) {
        console.error('Failed to check payment status with Xdigitex:', error);
        // Return current status from our DB
      }
    }

    // Get the associated loan application if exists
    let application = null;
    if (payment.applicationId) {
      application = await db.loanApplication.findUnique({
        where: { id: payment.applicationId },
      });
    }

    return NextResponse.json({
      payment: {
        id: payment.id,
        transactionId: payment.transactionId,
        paymentRef: payment.paymentRef,
        phoneNumber: payment.phoneNumber,
        amount: payment.amount,
        status: payment.status,
        type: payment.type,
        createdAt: payment.createdAt,
      },
      application: application ? {
        id: application.id,
        status: application.status,
        activationPaid: application.activationPaid,
        activationRef: application.activationRef,
        paymentRef: application.paymentRef,
      } : null,
    });
  } catch (error) {
    console.error('Payment status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check payment status' },
      { status: 500 }
    );
  }
}
