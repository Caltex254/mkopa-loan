import { PrismaClient } from '../src/generated/prisma';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

async function seed() {
  // Create admin user
  const existingAdmin = await db.user.findUnique({ where: { email: 'admin@mkopa.com' } });
  if (!existingAdmin) {
    const hash = await bcrypt.hash('admin123', 12);
    await db.user.create({
      data: {
        fullName: 'Admin User',
        phone: '+254700000000',
        email: 'admin@mkopa.com',
        passwordHash: hash,
        role: 'admin',
      },
    });
    console.log('Admin user created');
  }

  // Create loan products
  const products = [
    { amount: 5000, processingFee: 299 },
    { amount: 10000, processingFee: 599 },
    { amount: 20000, processingFee: 1199 },
    { amount: 50000, processingFee: 2999 },
    { amount: 100000, processingFee: 5999 },
    { amount: 200000, processingFee: 11999 },
    { amount: 500000, processingFee: 29999 },
  ];

  for (const p of products) {
    const existing = await db.loanProduct.findFirst({ where: { amount: p.amount } });
    if (!existing) {
      await db.loanProduct.create({ data: p });
    }
  }
  console.log('Loan products seeded');

  await db.$disconnect();
}

seed().catch(console.error);
