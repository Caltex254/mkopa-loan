const { PrismaClient } = require('/home/z/my-project/src/generated/prisma');
const db = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});
(async () => {
  const result = await db.$queryRawUnsafe(`
    SELECT tablename, indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname NOT LIKE '%_pkey'
      AND indexname NOT LIKE '%_key'
    ORDER BY tablename, indexname;
  `);
  console.log('Non-unique indexes in public schema:');
  for (const r of result) {
    console.log('  ' + r.tablename + ' | ' + r.indexname);
  }
  await db.$disconnect();
})().catch(e => { console.error(e.message); process.exit(1); });
