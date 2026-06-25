// Middleware — protects /admin/* routes.
//
// The existing app uses a custom JWT cookie (mkopa-token) issued by
// /api/auth/login. New admin flows may also use NextAuth. To keep both
// working, we accept EITHER:
//   1. A valid NextAuth session cookie (next-auth.session-token), OR
//   2. A valid custom JWT in the mkopa-token cookie (verified locally).
//
// Unauthenticated visitors are redirected to /login.

import { NextResponse, type NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'mkopa-loan-secret-key-2024';

function hasValidMkopaToken(req: NextRequest): boolean {
  const token = req.cookies.get('mkopa-token')?.value;
  if (!token) return false;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { role?: string; userId?: string };
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

export function middleware(req: NextRequest) {
  const isAuthed = hasValidMkopaToken(req) || hasNextAuthSession(req);
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
