import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Callback endpoint for Xdigitex Pay redirect after payment
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('reference');
    const status = searchParams.get('status') || searchParams.get('pawa_status');

    console.log('Payment callback received:', { reference, status });

    if (reference) {
      // Find and update the payment
      const payment = await db.payment.findFirst({
        where: { transactionId: reference },
      });

      if (payment) {
        let newStatus = payment.status;
        if (status === 'completed' || status === 'success' || status === 'ACCEPTED') {
          newStatus = 'completed';
        } else if (status === 'failed' || status === 'rejected') {
          newStatus = 'failed';
        }

        if (newStatus !== payment.status) {
          await db.payment.update({
            where: { id: payment.id },
            data: { status: newStatus },
          });

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

            await db.notification.create({
              data: {
                userId: payment.userId,
                title: 'Activation Fee Paid',
                message: `Your activation fee of KES ${payment.amount} has been received. Your loan application is now submitted for review.`,
              },
            });

            await db.activityLog.create({
              data: {
                userId: payment.userId,
                action: 'ACTIVATION_FEE_PAID',
                details: `Paid activation fee of KES ${payment.amount} via callback. Transaction: ${payment.transactionId}`,
              },
            });
          }
        }
      }
    }

    // Redirect to the application page
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${baseUrl}/?payment=${status || 'processing'}&ref=${reference || ''}`);
  } catch (error) {
    console.error('Payment callback error:', error);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${baseUrl}/?payment=error`);
  }
}

export async function POST(request: NextRequest) {
  // Also handle POST callbacks
  try {
    const body = await request.json();
    console.log('Payment callback POST received:', body);

    const reference = body.reference || body.tx_ref;
    const status = body.status || body.pawa_status;

    if (reference) {
      const payment = await db.payment.findFirst({
        where: { transactionId: reference },
      });

      if (payment) {
        let newStatus = payment.status;
        if (status === 'completed' || status === 'success' || status === 'ACCEPTED') {
          newStatus = 'completed';
        } else if (status === 'failed' || status === 'rejected') {
          newStatus = 'failed';
        }

        if (newStatus !== payment.status) {
          await db.payment.update({
            where: { id: payment.id },
            data: { status: newStatus },
          });

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

            await db.notification.create({
              data: {
                userId: payment.userId,
                title: 'Activation Fee Paid',
                message: `Your activation fee of KES ${payment.amount} has been received. Your loan application is now submitted for review.`,
              },
            });

            await db.activityLog.create({
              data: {
                userId: payment.userId,
                action: 'ACTIVATION_FEE_PAID',
                details: `Paid activation fee of KES ${payment.amount} via POST callback. Transaction: ${payment.transactionId}`,
              },
            });
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Payment callback POST error:', error);
    return NextResponse.json({ error: 'Callback processing failed' }, { status: 500 });
  }
}
