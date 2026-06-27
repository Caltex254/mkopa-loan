import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

/**
 * Size presets for image delivery.
 *
 * Customer-uploaded ID photos can be huge (4-5 MB, 4080x3060) — loading two
 * of them in the admin KYC dialog (front + back) means ~9 MB and 15-30s of
 * wait time, which the admin perceives as "documents won't load".
 *
 * The fix: serve resized, compressed derivatives depending on where the
 * image is shown. The full-resolution original is only sent on explicit
 * download.
 *
 *   size=thumb   → inline preview in the KYC detail dialog
 *                  max 700px wide, JPEG q72, ~50-150 KB
 *                  Loads in <1s even through Cloudflare Tunnel.
 *
 *   size=preview → large popup viewer (click-to-zoom)
 *                  max 1600px wide, JPEG q82, ~300-600 KB
 *                  Readable for verification, still fast.
 *
 *   (default)    → original full-size image, only used by the Download button.
 */
type SizePreset = 'thumb' | 'preview' | 'full';

function parseSize(value: string | null): SizePreset {
  if (value === 'thumb' || value === 'preview') return value;
  return 'full';
}

// Lazy-load sharp. We use `eval('require')` to bypass Turbopack's bundler
// tracing — Turbopack mangles sharp's `module.exports = Sharp` into an
// interop object whose default isn't callable, so calling `sharp(buf)`
// throws "X is not a function". Using Node's native require at runtime
// sidesteps the bundler entirely and gets us the real Sharp constructor.
//
// On Vercel serverless, sharp's native binaries may not be available.
// In that case we gracefully fall back to serving the original image
// (no resize) — bigger payload, but at least the image is visible.
let _sharp: ((input: Buffer) => { rotate: () => unknown; resize: (opts: unknown) => unknown; jpeg: (opts: unknown) => unknown; toBuffer: () => Promise<Buffer> }) | null = null;
let _sharpUnavailable = false;
function getSharp(): typeof _sharp {
  if (_sharp) return _sharp;
  if (_sharpUnavailable) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-eval, @typescript-eslint/no-require-imports
    const nativeRequire = eval('require') as NodeRequire;
    const mod = nativeRequire('sharp');
    const fn = (typeof mod === 'function' ? mod : mod.default);
    if (typeof fn !== 'function') {
      _sharpUnavailable = true;
      return null;
    }
    _sharp = fn as typeof _sharp;
    return _sharp;
  } catch {
    // sharp not available (e.g. Vercel serverless without native binaries)
    _sharpUnavailable = true;
    return null;
  }
}

// Small in-process LRU-ish cache for resized derivatives.
// Key: `${kycId}:${side}:${size}`. Capped at 64 entries to bound memory.
// This is per-worker; across requests the browser Cache-Control header does
// the heavy lifting, this just avoids re-running sharp when the admin flips
// between records within the same worker lifetime.
const resizeCache = new Map<string, { buf: Buffer; ts: number }>();
const RESIZE_CACHE_MAX = 64;

function getCached(key: string): Buffer | null {
  const hit = resizeCache.get(key);
  if (!hit) return null;
  // Move to end (most-recently-used) by re-inserting.
  resizeCache.delete(key);
  resizeCache.set(key, hit);
  return hit.buf;
}

function setCached(key: string, buf: Buffer) {
  if (resizeCache.size >= RESIZE_CACHE_MAX) {
    // Evict oldest entry (first key in insertion order).
    const firstKey = resizeCache.keys().next().value;
    if (firstKey) resizeCache.delete(firstKey);
  }
  resizeCache.set(key, { buf, ts: Date.now() });
}

async function resizeForPreset(
  source: Buffer,
  preset: SizePreset
): Promise<{ buf: Buffer; wasResized: boolean }> {
  if (preset === 'full') return { buf: source, wasResized: false };
  const sharp = getSharp();
  if (!sharp) {
    // sharp not available (e.g. Vercel serverless) — fall back to original image.
    // The browser will display it at whatever size the <img> element specifies,
    // so the admin can still see and verify the document.
    return { buf: source, wasResized: false };
  }
  const width = preset === 'thumb' ? 700 : 1600;
  const quality = preset === 'thumb' ? 72 : 82;
  // rotate() auto-applies EXIF orientation, so portrait phone photos of ID
  // cards show upright instead of sideways.
  const buf = await sharp(source)
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .jpeg({ quality, mozjpeg: true, progressive: true })
    .toBuffer();
  return { buf, wasResized: true };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ kycId: string }> }
) {
  try {
    const user = await getUserFromRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const { kycId } = await params;
    const { searchParams } = new URL(request.url);
    const side = searchParams.get('side'); // 'front' or 'back'
    const size = parseSize(searchParams.get('size'));

    if (!kycId) {
      return NextResponse.json(
        { error: 'kycId is required' },
        { status: 400 }
      );
    }

    if (!side || !['front', 'back'].includes(side)) {
      return NextResponse.json(
        { error: 'Query parameter "side" must be "front" or "back"' },
        { status: 400 }
      );
    }

    // Fast path: serve cached derivative if we already resized this one.
    const cacheKey = `${kycId}:${side}:${size}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return new NextResponse(cached, {
        headers: {
          'Content-Type': 'image/jpeg',
          'Content-Length': cached.length.toString(),
          'Content-Disposition': `inline; filename="id_${side}_${size}.jpg"`,
          'Cache-Control': 'private, max-age=600, stale-while-revalidate=3600',
          'X-KYC-Image': 'cache-hit',
        },
      });
    }

    const kyc = await db.kYC.findUnique({
      where: { id: kycId },
      include: {
        user: {
          select: {
            fullName: true,
          },
        },
      },
    });

    if (!kyc) {
      return NextResponse.json(
        { error: 'KYC record not found' },
        { status: 404 }
      );
    }

    const imageData = side === 'front' ? kyc.idFrontImage : kyc.idBackImage;

    if (!imageData) {
      return NextResponse.json(
        { error: `No ${side} image found` },
        { status: 404 }
      );
    }

    // Decode base64 (data URL or raw).
    let source: Buffer;
    if (imageData.startsWith('data:')) {
      const matches = imageData.match(/^data:(.+?);base64,(.*)$/);
      if (matches) {
        source = Buffer.from(matches[2], 'base64');
      } else {
        return NextResponse.json(
          { error: 'Invalid image data format' },
          { status: 500 }
        );
      }
    } else {
      source = Buffer.from(imageData, 'base64');
    }

    // Resize (or pass through if size=full or sharp unavailable).
    const { buf: output, wasResized } = await resizeForPreset(source, size);

    // Cache derivative so subsequent requests for the same size are instant.
    if (size !== 'full' && wasResized) {
      setCached(cacheKey, output);
    }

    // Determine content type:
    // - If sharp resized the image, it's always JPEG.
    // - If we fell back to original (no resize), preserve the original format.
    // - For full-size we preserve the original content type if it was a data URL.
    const contentType = wasResized
      ? 'image/jpeg'
      : (imageData.startsWith('data:')
          ? (imageData.match(/^data:(.+?);base64,/)?.[1] ?? 'image/jpeg')
          : 'image/jpeg');

    const filenameBase = kyc.user.fullName.replace(/\s+/g, '_');
    const filename = size === 'full'
      ? `${filenameBase}_ID_${side}.jpg`
      : `${filenameBase}_ID_${side}_${size}.jpg`;

    return new NextResponse(output, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': output.length.toString(),
        'Content-Disposition': `inline; filename="${filename}"`,
        // Cache the image at the browser for 10 minutes (admin-only, private).
        // Re-opening the same KYC dialog won't re-download the image, which
        // keeps the admin dashboard snappy when flipping between records.
        'Cache-Control': 'private, max-age=600, stale-while-revalidate=3600',
        'X-KYC-Image': 'cache-miss',
      },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('KYC document download error:', errMsg);
    return NextResponse.json(
      { error: 'Failed to download document' },
      { status: 500 }
    );
  }
}
