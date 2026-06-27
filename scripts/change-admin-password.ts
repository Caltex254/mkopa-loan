// Script to update the admin user's password in the Neon database.
// Hashes the new password with bcrypt (12 rounds, matching src/lib/auth.ts)
// then updates the User row where email = 'admin@mkopa.com'.

import bcrypt from 'bcryptjs';
import { PrismaClient } from '../src/generated/prisma';

const NEW_PASSWORD = 'waynekipkoech1';
const ADMIN_EMAIL = 'admin@mkopa.com';

async function main() {
  console.log(`Updating admin password for ${ADMIN_EMAIL}...`);
  const prisma = new PrismaClient();
  try {
    const hash = await bcrypt.hash(NEW_PASSWORD, 12);
    console.log(`Generated bcrypt hash: ${hash.substring(0, 20)}...`);

    const updated = await prisma.user.update({
      where: { email: ADMIN_EMAIL },
      data: { passwordHash: hash },
      select: { id: true, email: true, role: true, fullName: true },
    });

    console.log('✅ Password updated successfully:');
    console.log(JSON.stringify(updated, null, 2));

    // Verify by comparing
    const user = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
    const matches = await bcrypt.compare(NEW_PASSWORD, user?.passwordHash || '');
    console.log(`\nVerification (bcrypt.compare): ${matches ? '✅ PASS' : '❌ FAIL'}`);
  } catch (err) {
    console.error('❌ Failed to update password:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
