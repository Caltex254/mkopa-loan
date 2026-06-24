// NextAuth configuration — admin credentials provider backed by Neon.
//
// The existing app uses a custom JWT auth (see /src/lib/auth.ts). This
// NextAuth config is provided as the standard auth layer for the new
// R2-backed admin KYC pages. Both can coexist — existing /api/admin/*
// routes continue to use the custom JWT, while new /api/kyc/view and
// /api/kyc/upload-url routes can be wrapped with NextAuth session checks.

import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Admin Email + Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password ?? '';
        if (!email || !password) return null;

        // NOTE: Wire this to your `admin_users` table (Drizzle or Prisma).
        // For now, accept the bootstrap admin from env vars so the new
        // R2 KYC routes are testable without a schema migration.
        const adminEmail = (process.env.ADMIN_EMAIL || 'admin@mkopa.com').toLowerCase();
        const adminPassword = process.env.ADMIN_PASSWORD || 'changeme123';

        if (email === adminEmail && password === adminPassword) {
          return {
            id: 'admin-bootstrap',
            email: adminEmail,
            name: 'Admin',
            role: 'admin',
          } as { id: string; email: string; name?: string | null; role: string };
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as { id: string }).id;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string | undefined;
        (session.user as { role?: string }).role = token.role as string | undefined;
      }
      return session;
    },
  },
};

export type AppSession = {
  user: {
    id: string;
    email: string;
    name?: string | null;
    role: string;
  };
};
