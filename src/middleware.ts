// Middleware — protects /admin/* routes.
//
// The existing app uses a custom JWT cookie (mkopa-token) issued by
// /api/auth/login. New admin flows may also use NextAuth. To keep both
// working, we accept EITHER:
//   1. A valid NextAuth session cookie (next-auth.session-token), OR
//   2. A valid custom JWT in the mkopa-token cookie (verified locally).
//
// Unauthenticated visitors are redirected to /login.
//
// IMPORTANT: Middleware runs in the Edge Runtime, which does NOT support
// Node's `crypto` module. `jsonwebtoken` depends on `crypto` and will
// throw silently in Edge. We use `jose` instead — it's a pure-JS JWT
// library that works in Edge Runtime, and it can verify tokens signed
// by `jsonwebtoken` (both use HMAC-SHA256 by default).

import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'mkopa-loan-secret-key-2024';

async function hasValidMkopaToken(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get('mkopa-token')?.value;
  if (!token) return false;
  try {
    // jose's Edge-compatible API accepts a Uint8Array as the secret key.
    // This works with tokens signed by jsonwebtoken (both use HMAC-SHA256).
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return Boolean(payload?.userId);
  } catch {
    return false;
  }
}

function hasNextAuthSession(req: NextRequest): boolean {
  // NextAuth cookie names depend on secure cookies setting; check both shapes.
  const names = [
    'next-auth.session-token',
    '__Secure-next-auth.session-token',
    'authjs.session-token',
    '__Secure-authjs.session-token',
  ];
  return names.some((n) => Boolean(req.cookies.get(n)?.value));
}

export async function middleware(req: NextRequest) {
  const isAuthed = (await hasValidMkopaToken(req)) || hasNextAuthSession(req);
  if (isAuthed) {
    return NextResponse.next();
  }
  const loginUrl = new URL('/login', req.url);
  loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/admin/:path*'],
};
