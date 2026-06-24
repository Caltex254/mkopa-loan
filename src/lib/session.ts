// Server-side helper for NextAuth-protected routes.

import { getServerSession } from 'next-auth';
import { authOptions } from './nextauth';

export async function requireAdmin(): Promise<{
  user: { id: string; email: string; name?: string | null; role: string };
} | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role;
  if (role !== 'admin') return null;
  return {
    user: {
      id: (session.user as { id: string }).id,
      email: session.user.email!,
      name: session.user.name,
      role,
    },
  };
}
