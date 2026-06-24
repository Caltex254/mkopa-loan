import { defineConfig } from 'drizzle-kit';

// Drizzle Kit configuration.
// The existing app uses Prisma as its primary ORM; this config lets you
// optionally use Drizzle for new features (e.g. the R2-backed KYC flow)
// without removing Prisma. Run `npm run db:generate` or `npm run db:push`
// to apply schema changes.

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
