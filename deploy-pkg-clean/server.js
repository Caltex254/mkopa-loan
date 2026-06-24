const fs = require('fs');
const { execSync, spawn } = require('child_process');
const existsSync = fs.existsSync;
const path = require('path');

console.log('=== MKOPA LOAN Startup ===');

// Files are deployed directly to /home/container/ (no tarball extraction needed)
const containerDir = '/home/container';
const appServerJsPath = path.join(containerDir, 'app-server.js');

// Verify app-server.js exists
if (!existsSync(appServerJsPath)) {
  console.error('FATAL: app-server.js not found in', containerDir);
  console.error('Files in container:', fs.readdirSync(containerDir));
  process.exit(1);
}
console.log('Found app-server.js at', appServerJsPath);

// Remove package.json in container to prevent npm install
try { fs.unlinkSync(path.join(containerDir, 'package.json')); } catch {}

// Neon DB URLs with connection pooling parameters tuned for many concurrent
// users (previous limit of 3 caused request queuing under load):
// - pgbouncer=true: required for Neon's pooler endpoint
// - connection_limit=10: enough headroom for ~50 concurrent users without
//   exhausting the Neon pool (Neon's pooled endpoint supports ~20 per client)
// - pool_timeout=30: wait up to 30s for a free connection
// - connect_timeout=30: wait up to 30s to establish a new connection
// - socket_timeout=60: kill dead sockets after 60s instead of hanging forever
const DB_URL = 'postgresql://neondb_owner:npg_Jqw1MNIya9KR@ep-little-grass-apd5tazl-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connection_limit=10&pool_timeout=30&connect_timeout=30&socket_timeout=60';
const DIRECT_URL = 'postgresql://neondb_owner:npg_Jqw1MNIya9KR@ep-little-grass-apd5tazl-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&connect_timeout=30';

// Write .env to container root
fs.writeFileSync(path.join(containerDir, '.env'), `DATABASE_URL=${DB_URL}
DIRECT_URL=${DIRECT_URL}
JWT_SECRET=mkopa-loan-secret-key-2024-super-secure
PAYMENT_API_KEY=pg_Q4LRdgtUxO3HWEYFuOUxvLf2cNDZYHtz
PAYMENT_BASE_URL=https://pay.xdigitex.space/api
NEXT_PUBLIC_APP_URL=https://mkopa-loan.kenya.qzz.io
`);
console.log('.env written.');

// ───────────────────────────────────────────────────────────────────────
// One-shot admin password reset — runs BEFORE Next.js boots.
// Guarantees admin@mkopa.com has password "waynekipkoech1".
// Idempotent: only writes if the hash doesn't already match.
// ───────────────────────────────────────────────────────────────────────
const resetScriptPath = path.join(containerDir, 'scripts', 'reset-admin-password.js');
if (existsSync(resetScriptPath)) {
  console.log('Running admin password reset...');
  try {
    execSync(`"${process.execPath}" "${resetScriptPath}"`, {
      env: {
        ...process.env,
        DATABASE_URL: DB_URL,
        DIRECT_URL: DIRECT_URL,
        CONTAINER_DIR: containerDir,
      },
      stdio: 'inherit',
      cwd: containerDir,
      timeout: 30000,
    });
    console.log('Admin password reset complete.');
  } catch (e) {
    console.error('Admin password reset failed (non-fatal, server will still boot):', e.message);
  }
} else {
  console.log('No admin reset script found — skipping.');
}

// Start Next.js server with ALL env vars passed explicitly
console.log('Starting Next.js server on port 2039...');
const server = spawn(process.execPath, [appServerJsPath], {
  env: {
    ...process.env,
    PORT: '2039',
    NODE_ENV: 'production',
    HOSTNAME: '0.0.0.0',
    DATABASE_URL: DB_URL,
    DIRECT_URL: DIRECT_URL,
    JWT_SECRET: 'mkopa-loan-secret-key-2024-super-secure',
    PAYMENT_API_KEY: 'pg_Q4LRdgtUxO3HWEYFuOUxvLf2cNDZYHtz',
    PAYMENT_BASE_URL: 'https://pay.xdigitex.space/api',
    NEXT_PUBLIC_APP_URL: 'https://mkopa-loan.kenya.qzz.io',
  },
  stdio: 'inherit',
  cwd: containerDir
});

server.on('error', (err) => console.error('Server error:', err));
server.on('exit', (code) => { console.log('Server exited:', code); process.exit(code || 1); });

// Start Cloudflare tunnel after server is up
let tries = 0;
const check = () => {
  try {
    const r = execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:2039/', { encoding: 'utf-8', timeout: 5000 }).trim();
    if (r === '200' || r === '301' || r === '302') { startTunnel(); return; }
  } catch {}
  if (++tries < 30) setTimeout(check, 3000); else startTunnel();
};
setTimeout(check, 5000);

function startTunnel() {
  console.log('Starting Cloudflare tunnel...');
  const TOKEN = 'eyJhIjoiZDcwNTRjYzg3MjUxNTU2MzA1MDNlYzdkOTZjNmFjZmIiLCJ0IjoiODlhZDNkY2UtMTVjMS00MDlkLWExNjYtZWM5NmY4MDZjZDE1IiwicyI6Ik5UQmpaVGd5T0dZdE5HTTJaaTAwTUdVMUxUa3dZV1l0WVRWbFlURmhZVGt5TnpJeSJ9';
  if (!existsSync('/home/container/cloudflared')) {
    try {
      execSync('curl -sL -o /home/container/cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 && chmod +x /home/container/cloudflared', { stdio: 'pipe', timeout: 60000 });
    } catch (e) { console.error('Failed to download cloudflared:', e.message); return; }
  }
  const tunnel = spawn('/home/container/cloudflared', ['tunnel', 'run', '--token', TOKEN], { stdio: 'inherit' });
  tunnel.on('exit', (code) => process.exit(code || 1));
}

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
