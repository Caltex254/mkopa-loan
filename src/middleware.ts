// Middleware — protects /admin/* with NextAuth session.
// Unauthenticated visitors are redirected to /login.
//
// NOTE: The existing app's admin pages use a custom JWT cookie (mkopa-token).
// This NextAuth middleware protects /admin/* paths that use the new
// NextAuth-based R2 KYC flow. The existing /api/admin/* routes continue
// to use the custom JWT auth in /src/lib/auth.ts.

import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/login',
  },
});

export const config = {
  matcher: ['/admin/:path*'],
};
