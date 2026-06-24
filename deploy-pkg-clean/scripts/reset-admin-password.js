/**
 * One-shot admin password reset — runs BEFORE Next.js boots.
 *
 * Guarantees the admin account exists with:
 *   email:    admin@mkopa.com
 *   password: waynekipkoech1
 *
 * Idempotent: if the hash already matches, no DB write happens.
 * Safe to run on every boot.
 *
 * This script uses the bundled @prisma/client (from the standalone build)
 * and bcryptjs (also bundled). It reads DATABASE_URL from process.env.
 */
const path = require('path');
const fs = require('fs');

// ── Locate the bundled Prisma client ────────────────────────────────────
// In the standalone build, the generated client lives at:
//   /home/container/src/generated/prisma/index.js
// (we copy it there during the build-package step).
const CONTAINER_DIR = process.env.CONTAINER_DIR || '/home/container';
const PRISMA_CLIENT_PATH = path.join(CONTAINER_DIR, 'src/generated/prisma/index.js');

if (!fs.existsSync(PRISMA_CLIENT_PATH)) {
  console.error('[admin-reset] Prisma client not found at', PRISMA_CLIENT_PATH);
  console.error('[admin-reset] Skipping admin password reset.');
  process.exit(0); // non-fatal — let the server still boot
}

let PrismaClient;
try {
  ({ PrismaClient } = require(PRISMA_CLIENT_PATH));
} catch (e) {
  console.error('[admin-reset] Failed to load Prisma client:', e.message);
  process.exit(0);
}

let bcrypt;
try {
  bcrypt = require('bcryptjs');
} catch (e) {
  console.error('[admin-reset] bcryptjs not available:', e.message);
  process.exit(0);
}

const ADMIN_EMAIL = 'admin@mkopa.com';
const ADMIN_PASSWORD = 'waynekipkoech1';
const ADMIN_FULL_NAME = 'Admin User';
const ADMIN_PHONE = '+254700000000';

async function resetAdmin() {
  if (!process.env.DATABASE_URL) {
    console.error('[admin-reset] DATABASE_URL not set — skipping.');
    return;
  }

  const db = new PrismaClient({
    log: ['error'],
    datasources: { db: { url: process.env.DATABASE_URL } },
  });

  try {
    const existing = await db.user.findUnique({ where: { email: ADMIN_EMAIL } });

    if (existing) {
      // Check if password already matches — if so, skip the write
      const matches = await bcrypt.compare(ADMIN_PASSWORD, existing.passwordHash);
      if (matches) {
        console.log('[admin-reset] Admin password already correct — no change needed.');
        return;
      }

      // Update password (and ensure role is admin in case it was changed)
      const newHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
      await db.user.update({
        where: { email: ADMIN_EMAIL },
        data: { passwordHash: newHash, role: 'admin', isActive: true },
      });
      console.log('[admin-reset] Admin password updated to "waynekipkoech1".');
    } else {
      // Admin doesn't exist — create it
      const newHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
      await db.user.create({
        data: {
          fullName: ADMIN_FULL_NAME,
          phone: ADMIN_PHONE,
          email: ADMIN_EMAIL,
          passwordHash: newHash,
          role: 'admin',
          isActive: true,
        },
      });
      console.log('[admin-reset] Admin user created with password "waynekipkoech1".');
    }
  } catch (e) {
    console.error('[admin-reset] Error during reset:', e.message);
  } finally {
    try { await db.$disconnect(); } catch {}
  }
}

resetAdmin();
