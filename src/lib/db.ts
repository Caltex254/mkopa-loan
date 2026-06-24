// Workaround for Prisma v6 + Next.js standalone build:
// The `#main-entry-point` subpath import in @prisma/client/default.js
// is not followed correctly by Turbopack's standalone tracing.
// Importing from the generated client directly bypasses this issue.
import { PrismaClient } from '../generated/prisma'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Neon's pgbouncer pooler closes idle connections after ~30s of inactivity.
    // Without these settings, Prisma tries to reuse a closed connection and
    // throws "Error: Closed". Tuning these makes Prisma open fresh connections
    // as needed and stop trying to reuse dead ones.
  })
}

// Reuse a single PrismaClient across hot reloads in dev, and across requests
// in production (Next.js standalone reuses the module-level singleton).
export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// ───────────────────────────────────────────────────────────────────────────
// CONNECTION-ERROR RECOVERY
// ───────────────────────────────────────────────────────────────────────────
// When the Neon pgbouncer pooler reclaims an idle connection out from under
// Prisma (which happens routinely on serverless / low-traffic deployments),
// the next query fails with a "Closed" or "Connection terminated" error.
// We listen for those errors and force a `$reconnect` so the very next
// request gets a fresh connection instead of crashing the API route.
// ───────────────────────────────────────────────────────────────────────────
db.$on('error' as never, async (e: unknown) => {
  const err = e as { message?: string };
  const msg = (err?.message || '').toLowerCase();
  if (
    msg.includes('closed') ||
    msg.includes('connection terminated') ||
    msg.includes('connection ended') ||
    msg.includes("can't reach database server")
  ) {
    console.warn('[db] connection dropped by pooler — forcing reconnect');
    try {
      // `$disconnect` then re-create the client on the global, so the next
      // call to `db` picks up a fresh, healthy connection pool.
      await db.$disconnect();
      globalForPrisma.prisma = createPrismaClient();
    } catch {
      /* ignore */
    }
  }
});

// Graceful shutdown
process.on('beforeExit', async () => {
  try { await db.$disconnect(); } catch { /* ignore */ }
})

// Helper for DB operations with automatic retry on connection errors.
// Use this for critical writes where a transient connection blip should not
// surface as a 500 to the user.
export async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let retries = 0
  while (true) {
    try {
      return await fn()
    } catch (error: unknown) {
      const e = error as { code?: string; message?: string }
      const isConnectionError =
        e?.code === 'P1001' || // Can't reach database server
        e?.code === 'P1002' || // Database server timed out
        e?.code === 'P1008' || // Operations timed out
        e?.code === 'P1017' || // Server closed the connection
        (e?.message || '').toLowerCase().includes('closed') ||
        (e?.message || '').toLowerCase().includes('econnrefused') ||
        (e?.message || '').toLowerCase().includes('etimedout') ||
        (e?.message || '').toLowerCase().includes('connection refused') ||
        (e?.message || '').toLowerCase().includes('connection terminated') ||
        (e?.message || '').toLowerCase().includes('connection ended')

      if (!isConnectionError || retries >= maxRetries - 1) {
        throw error
      }

      retries++
      console.log(`[db] connection error (attempt ${retries}/${maxRetries}), retrying in ${retries * 500}ms...`)
      await new Promise(resolve => setTimeout(resolve, retries * 500))
    }
  }
}
