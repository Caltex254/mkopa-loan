import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { calculateActivationFee } from '@/lib/loans';

// Read env vars at REQUEST TIME (not module scope) to ensure they're available in standalone builds
function getPaymentConfig() {
  const apiKey = process.env.PAYMENT_API_KEY || '';
  const baseUrl = process.env.PAYMENT_BASE_URL || 'https://pay.xdigitex.space/api';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return { apiKey, baseUrl, appUrl };
}

// Format phone number to international format +254XXXXXXXXX
// Required by xdigitex: "Always use international format with country code"
function formatPhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '+254' + cleaned.substring(1);
  } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
    cleaned = '+254' + cleaned;
  } else if (cleaned.startsWith('254')) {
    cleaned = '+' + cleaned;
  } else if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  return cleaned;
}

// Detect network from phone prefix for UI labeling
// Comprehensive list of Kenyan mobile prefixes by operator
function detectNetwork(phone: string): 'safaricom' | 'airtel' | 'telkom' | 'unknown' {
  const cleaned = phone.replace(/\+/g, '');
  if (cleaned.startsWith('254')) {
    const prefix = cleaned.substring(3, 6);
    // Safaricom prefixes (0700-0729, 0740-0749, 0768-0769, 0790-0799, 0110-0115, 0100-0109, 0116-0118)
    const safaricomPrefixes = [
      '700','701','702','703','704','705','706','707','708','709',
      '710','711','712','713','714','715','716','717','718','719',
      '720','721','722','723','724','725','726','727','728','729',
      '740','741','742','743','744','745','746','747','748','749',
      '768','769',
      '790','791','792','793','794','795','796','797','798','799',
      '100','101','102','103','104','105','106','107','108','109',
      '110','111','112','113','114','115','116','117','118'
    ];
    if (safaricomPrefixes.includes(prefix)) return 'safaricom';
    // Airtel prefixes (0730-0739, 0750-0759, 0780-0789, 0100 reserved)
    const airtelPrefixes = [
      '730','731','732','733','734','735','736','737','738','739',
      '750','751','752','753','754','755','756','757','758','759',
      '780','781','782','783','784','785','786','787','788','789'
    ];
    if (airtelPrefixes.includes(prefix)) return 'airtel';
    // Telkom prefixes (0770-0779)
    const telkomPrefixes = ['770','771','772','773','774','775','776','777','778','779'];
    if (telkomPrefixes.includes(prefix)) return 'telkom';
  }
  return 'unknown';
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { apiKey, baseUrl, appUrl } = getPaymentConfig();

    if (!apiKey) {
      console.error('Payment API key not configured - PAYMENT_API_KEY env var is empty');
      return NextResponse.json(
        { error: 'Payment service not configured. Please contact support.' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { applicationId, phoneNumber, gateway: preferredGateway } = body;

    if (!applicationId || !phoneNumber) {
      return NextResponse.json(
        { error: 'Application ID and phone number are required' },
        { status: 400 }
      );
    }

    // Find the loan application
    const application = await db.loanApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      return NextResponse.json(
        { error: 'Loan application not found' },
        { status: 404 }
      );
    }

    if (application.userId !== user.userId) {
      return NextResponse.json(
        { error: 'This application does not belong to you' },
        { status: 403 }
      );
    }

    if (application.status !== 'pending_activation') {
      return NextResponse.json(
        { error: `Application status must be 'pending_activation', current status is '${application.status}'` },
        { status: 400 }
      );
    }

    if (application.activationPaid) {
      return NextResponse.json(
        { error: 'Activation fee already paid for this application' },
        { status: 400 }
      );
    }

    // Fetch the user's actual email from DB (needed for xdigitex payment API)
    const dbUser = await db.user.findUnique({
      where: { id: user.userId },
      select: { email: true, fullName: true, phone: true },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: 'User record not found' },
        { status: 404 }
      );
    }

    const formattedPhone = formatPhone(phoneNumber);
    const detectedNetwork = detectNetwork(formattedPhone);
    // Activation fee scales with the loan amount selected by the user
    const activationAmount = calculateActivationFee(application.loanAmount);

    // IMPORTANT: We always use 'safaricom' or 'airtel' gateway because they
    // return a redirect_url (Pesapal secure checkout iframe) that we can embed
    // inside our project. The 'mobile' gateway was unreliable (returning HTTP 500
    // errors on xdigitex side) and gave no embeddable URL.
    let xdigitexGateway: string;
    if (preferredGateway === 'safaricom') {
      xdigitexGateway = 'safaricom';
    } else if (preferredGateway === 'airtel') {
      xdigitexGateway = 'airtel';
    } else if (detectedNetwork === 'airtel') {
      xdigitexGateway = 'airtel';
    } else {
      xdigitexGateway = 'safaricom';
    }

    // Pre-compute payment identifiers (no DB round trip needed for these)
    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const paymentRef = `REF-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    // Use the user's actual email from the DB. Fallback to a derived email
    const paymentEmail = dbUser.email && dbUser.email.includes('@')
      ? dbUser.email
      : `user-${user.userId.substring(0, 12)}@mkopa-loan.app`;

    // Split full name into first/last for xdigitex
    const nameParts = (dbUser.fullName || 'MKOPA User').trim().split(/\s+/);
    const firstName = nameParts[0] || 'MKOPA';
    const lastName = nameParts.slice(1).join(' ') || 'User';

    const paymentPayload: Record<string, unknown> = {
      amount: activationAmount,
      currency: 'KES',
      gateway: xdigitexGateway,
      phone: formattedPhone,
      email: paymentEmail,
      first_name: firstName,
      last_name: lastName,
      description: `Activation Fee - Loan Application ${applicationId}`,
      callback_url: `${appUrl}/api/payments/callback`,
      webhook_url: `${appUrl}/api/payments/webhook`,
    };

    console.log('Initiating payment (parallel DB+API):', {
      amount: activationAmount,
      gateway: xdigitexGateway,
      preferredGateway,
      phone: formattedPhone,
      email: paymentEmail,
      detectedNetwork,
      apiKey: apiKey ? `${apiKey.slice(0, 8)}...` : 'EMPTY',
    });

    // ═══════════════════════════════════════════════════════════════════════
    // PERFORMANCE OPTIMIZATION: Run DB create + xdigitex API call IN PARALLEL
    // This shaves ~200-500ms off the response time (the DB round trip happens
    // while we wait for xdigitex to respond).
    // ═══════════════════════════════════════════════════════════════════════
    const xdigitexFetchPromise = fetch(`${baseUrl}/payments/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(paymentPayload),
      // Tighter timeout — xdigitex usually responds in 1-3s
      signal: AbortSignal.timeout(15000),
    }).then(async (r) => ({ ok: r.ok, data: await r.json().catch(() => ({})) }));

    const dbCreatePromise = db.payment.create({
      data: {
        userId: user.userId,
        applicationId: application.id,
        transactionId,
        paymentRef,
        phoneNumber: formattedPhone,
        amount: activationAmount,
        status: 'pending',
        type: 'activation',
      },
    });

    // Race them in parallel — both must succeed
    const [xdigitexResult, payment] = await Promise.all([
      xdigitexFetchPromise,
      dbCreatePromise,
    ]).catch((err) => {
      console.error('Parallel payment init failed:', err);
      throw err;
    });

    const { ok: xdigitexResponseOk, data: xdigitexData } = xdigitexResult;

    if (!xdigitexResponseOk || !xdigitexData.success) {
      console.error('Xdigitex payment initiation failed:', xdigitexData);

      // Best-effort mark payment as failed (fire-and-forget, don't block response)
      db.payment.update({
        where: { id: payment.id },
        data: { status: 'failed' },
      }).catch(() => {});

      const errorMsg = xdigitexData.error || xdigitexData.message || 'Payment initiation failed';
      return NextResponse.json(
        {
          error: errorMsg,
          details: xdigitexData,
          gateway: xdigitexGateway,
        },
        { status: 400 }
      );
    }

    // Determine actual payment flow based on response
    const hasRedirectUrl = !!xdigitexData.redirect_url;
    const hasCheckoutUrl = !!xdigitexData.checkout_url;
    // The URL to embed in iframe - prefer redirect_url (Pesapal), fallback to checkout_url (pawapay)
    const embedUrl = xdigitexData.redirect_url || xdigitexData.checkout_url || null;
    const actualPaymentFlow = embedUrl ? 'redirect' : 'stk_push';

    const networkLabel = xdigitexGateway === 'safaricom'
      ? 'Safaricom M-Pesa'
      : 'Airtel Money';

    const message = `${networkLabel} checkout page loaded. Please complete payment in the secure window below.`;

    console.log('Payment initiated successfully:', {
      reference: xdigitexData.reference,
      gateway: xdigitexData.gateway,
      actualPaymentFlow,
      hasRedirectUrl,
      hasCheckoutUrl,
      fee: xdigitexData.fee,
      net_amount: xdigitexData.net_amount,
    });

    // Update payment with Xdigitex reference (fire-and-forget, don't block response)
    // This makes the response go back to the user FASTER so the iframe loads sooner.
    db.payment.update({
      where: { id: payment.id },
      data: {
        transactionId: xdigitexData.reference || transactionId,
        status: 'processing',
      },
    }).catch((err) => {
      console.error('Failed to update payment status to processing:', err);
    });

    return NextResponse.json({
      success: true,
      message,
      payment: {
        id: payment.id,
        transactionId: xdigitexData.reference || transactionId,
        paymentRef,
        amount: activationAmount,
        status: 'processing',
        type: 'activation',
        gateway: xdigitexGateway,
        reference: xdigitexData.reference,
        createdAt: payment.createdAt,
      },
      xdigitex: {
        reference: xdigitexData.reference,
        gateway: xdigitexData.gateway,
        message: xdigitexData.message,
        redirect_url: xdigitexData.redirect_url,
        checkout_url: xdigitexData.checkout_url,
        embed_url: embedUrl,
        order_tracking_id: xdigitexData.order_tracking_id,
        fee: xdigitexData.fee,
        net_amount: xdigitexData.net_amount,
      },
      paymentFlow: actualPaymentFlow,
      networkProvider: networkLabel,
    }, { status: 200 });

  } catch (error: unknown) {
    console.error('Activation payment error:', error);

    // Handle abort/timeout errors gracefully
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      return NextResponse.json(
        { error: 'Payment service took too long to respond. Please try again.' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process activation payment' },
      { status: 500 }
    );
  }
}
