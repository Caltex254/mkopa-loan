// POST /api/kyc/upload-url
//
// Issues a presigned POST URL for direct-to-R2 upload of an ID image.
// The customer's browser PUTs the file straight to Cloudflare R2 —
// the file bytes NEVER touch our server. We only persist the resulting
// R2 object key in Neon.
//
// Request body:
//   { side: 'front' | 'back', contentType: 'image/jpeg' | 'image/png' | 'image/webp', userId: string }
//
// Response:
//   {
//     key:       string,  // R2 object key to store in DB after upload
//     url:       string,  // POST target URL
//     fields:    Record<string,string>,  // form fields including 'key' and 'Content-Type'
//     expiresIn: number,  // seconds until presign expires (300 = 5 min)
//   }
//
// Customer uploads with:
//   const fd = new FormData();
//   Object.entries(fields).forEach(([k,v]) => fd.append(k, v));
//   fd.append('file', file);
//   await fetch(url, { method: 'POST', body: fd });

import { NextRequest, NextResponse } from 'next/server';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { getR2Client, r2BucketName } from '@/lib/r2';
import { randomUUID } from 'crypto';

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB cap per ID photo
const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const PRESIGN_EXPIRY_SECONDS = 300; // 5 min

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { side, contentType, userId } = body as {
      side?: string;
      contentType?: string;
      userId?: string;
    };

    if (side !== 'front' && side !== 'back') {
      return NextResponse.json(
        { error: "side must be 'front' or 'back'" },
        { status: 400 }
      );
    }
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }
    if (!contentType || !ALLOWED_CONTENT_TYPES.includes(contentType)) {
      return NextResponse.json(
        {
          error: 'contentType must be one of: ' + ALLOWED_CONTENT_TYPES.join(', '),
        },
        { status: 400 }
      );
    }

    // Build a unique object key: kyc/{userId}/{uuid}-{side}.{ext}
    const ext = contentType.split('/')[1]; // jpeg|png|webp
    const key = `kyc/${userId}/${randomUUID()}-${side}.${ext}`;

    const client = getR2Client();
    const post = await createPresignedPost(client, {
      Bucket: r2BucketName(),
      Key: key,
      Conditions: [
        ['content-length-range', 1, MAX_BYTES],
        ['starts-with', '$Content-Type', 'image/'],
      ],
      Fields: {
        'Content-Type': contentType,
      },
      Expires: PRESIGN_EXPIRY_SECONDS,
    });

    return NextResponse.json({
      key,
      url: post.url,
      fields: post.fields,
      expiresIn: PRESIGN_EXPIRY_SECONDS,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[upload-url] presign failed:', msg);
    return NextResponse.json(
      { error: 'Failed to issue upload URL', detail: msg },
      { status: 500 }
    );
  }
}
