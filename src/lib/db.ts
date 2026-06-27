// Prisma client configured for Vercel + Neon Postgres.
//
// On Vercel (Node.js runtime), the default Prisma library engine works
// perfectly with the rhel-openssl-3.0.x binary target. No adapter needed.
//
// (Cloudflare Workers deployment is not feasible on the free tier due to
// the 3 MB compressed Worker size limit — Prisma's WASM engine alone is
// 2.3 MB uncompressed, which pushes the bundle over the limit even before
// adding the rest of the app. Vercel's free tier has no such limit.)

import { PrismaClient } from '../generated/prisma';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

// Helper for DB operations with automatic retry on connection errors.
export async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let retries = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: unknown) {
      const e = error as { code?: string; message?: string };
      const isConnectionError =
        e?.code === 'P1001' ||
        e?.code === 'P1002' ||
        e?.code === 'P1008' ||
        e?.code === 'P1017' ||
        (e?.message || '').toLowerCase().includes('closed') ||
        (e?.message || '').toLowerCase().includes('econnrefused') ||
        (e?.message || '').toLowerCase().includes('etimedout') ||
        (e?.message || '').toLowerCase().includes('connection refused') ||
        (e?.message || '').toLowerCase().includes('connection terminated') ||
        (e?.message || '').toLowerCase().includes('connection ended');

      if (!isConnectionError || retries >= maxRetries - 1) {
        throw error;
      }

      retries++;
      console.log(`[db] connection error (attempt ${retries}/${maxRetries}), retrying in ${retries * 500}ms...`);
      await new Promise((resolve) => setTimeout(resolve, retries * 500));
    }
  }
}
