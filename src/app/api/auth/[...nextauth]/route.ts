// NextAuth catch-all route handler at /api/auth/[...nextauth].
// Mounts NextAuth using the shared authOptions.

import NextAuth from 'next-auth';
import { authOptions } from '@/lib/nextauth';

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
