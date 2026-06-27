// Neon serverless + Drizzle ORM client.
//
// Uses @neondatabase/serverless (HTTP driver, works in Vercel serverless + Edge).
// Drizzle wraps the Neon SQL result for type-safe query building.
//
// This is provided as an alternative to the existing Prisma client at
// /src/lib/db.ts. New R2-backed KYC routes use this Drizzle client so
// the schema can be evolved independently; existing routes continue
// using Prisma unchanged.
//
// The client is created lazily on first use to avoid throwing at build
// time when DATABASE_URL isn't set in the CI environment.

import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle, NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './schema';

neonConfig.fetchEndpoint = (host: string) => `https://${host}/sql`;

export { schema };

let _db: NeonHttpDatabase<typeof schema> | null = null;

export function getDb(): NeonHttpDatabase<typeof schema> {
  if (_db) return _db;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is not set. Copy .env.example to .env and fill in your Neon connection string.'
    );
  }
  const sql = neon(databaseUrl);
  _db = drizzle(sql, { schema });
  return _db;
}

// Convenience property accessor so callers can do `db.select(...)` directly.
// Delegates to getDb() on first access.
export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real as object, prop);
    return typeof value === 'function' ? value.bind(real) : value;
  },
});
