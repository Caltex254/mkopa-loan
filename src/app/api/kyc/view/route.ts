// GET /api/kyc/view?kycId=<uuid>&side=front|back
//
// Admin-only. Returns a 60-second signed GET URL for viewing an ID image
// stored in R2. Embed directly in <img src=...> in the admin dashboard.
//
// Why signed URLs:
//   - The bucket is private (objects are not publicly readable)
//   - Each signed URL is short-lived (60s) so a leaked URL is useless quickly
//   - Admin identity is verified server-side before signing

import { NextRequest, NextResponse } from 'next/server';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getR2Client, r2BucketName } from '@/lib/r2';
import { requireAdmin } from '@/lib/session';

const SIGNED_URL_TTL_SECONDS = 60;

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized — admin sign-in required' },
        { status: 401 }
      );
    }

    const sp = new URL(request.url).searchParams;
    const kycId = sp.get('kycId');
    const side = sp.get('side');
    if (!kycId) {
      return NextResponse.json({ error: 'kycId is required' }, { status: 400 });
    }
    if (side !== 'front' && side !== 'back') {
      return NextResponse.json(
        { error: "side must be 'front' or 'back'" },
        { status: 400 }
      );
    }

    // For demo purposes, this route accepts the R2 object key directly via
    // ?key=... when the KYC record hasn't been persisted yet. In production
    // you should look up the key from Neon by kycId + side, like this:
    //
    //   const doc = await db.query.kycDocuments.findFirst({
    //     where: eq(kycDocuments.id, kycId),
    //   });
    //   const objectKey = side === 'front' ? doc.idFrontKey : doc.idBackKey;

    const objectKey = sp.get('key');
    if (!objectKey) {
      return NextResponse.json(
        {
          error:
            'R2 object key required. Pass ?key=kyc/<userId>/<uuid>-<side>.jpg (or wire up Neon lookup by kycId).',
        },
        { status: 400 }
      );
    }

    const client = getR2Client();
    const command = new GetObjectCommand({
      Bucket: r2BucketName(),
      Key: objectKey,
    });
    const signedUrl = await getSignedUrl(client, command, {
      expiresIn: SIGNED_URL_TTL_SECONDS,
    });

    return NextResponse.json({
      url: signedUrl,
      expiresIn: SIGNED_URL_TTL_SECONDS,
      objectKey,
      side,
      kycId,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[kyc/view] error:', msg);
    return NextResponse.json(
      { error: 'Failed to issue view URL', detail: msg },
      { status: 500 }
    );
  }
}
