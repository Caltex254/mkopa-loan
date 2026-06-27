#!/bin/bash
# MKOPA LOAN - Start with Cloudflare Tunnel on Pterodactyl
# This script starts the Next.js app and the Cloudflare Tunnel
set -e

echo "=== MKOPA LOAN - Starting Application with Cloudflare Tunnel ==="

cd /home/container

# First run setup
if [ ! -f ".deployed" ]; then
  echo "First run detected - setting up application..."

  # Extract source if tarball exists
  if [ -f "project-source.tar.gz" ]; then
    echo "Extracting project source..."
    tar -xzf project-source.tar.gz
  fi

  # Install dependencies
  if [ -f "package.json" ]; then
    echo "Installing dependencies..."
    npm install --production=false
  fi

  # Generate Prisma client
  echo "Generating Prisma client..."
  npx prisma generate

  # Push database schema
  echo "Pushing database schema..."
  npx prisma db push --skip-generate

  # Seed database
  echo "Seeding database..."
  npx tsx prisma/seed.ts 2>/dev/null || node -e "
    const { PrismaClient } = require('@prisma/client');
    const bcrypt = require('bcryptjs');
    const db = new PrismaClient();
    async function seed() {
      const existing = await db.user.findUnique({ where: { email: 'admin@mkopa.com' } });
      if (!existing) {
        const hash = await bcrypt.hash('admin123', 12);
        await db.user.create({ data: { fullName: 'Admin User', phone: '+254700000000', email: 'admin@mkopa.com', passwordHash: hash, role: 'admin' } });
        console.log('Admin user created');
      }
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
        if (!existing) await db.loanProduct.create({ data: p });
      }
      console.log('Loan products seeded');
      await db.\$disconnect();
    }
    seed().catch(console.error);
  " 2>/dev/null || true

  # Build Next.js
  echo "Building Next.js application..."
  npx next build

  # Mark as deployed
  touch .deployed
  echo "Setup complete!"
else
  echo "Application already deployed - starting server..."
fi

# Start Next.js in background
echo "Starting Next.js on port ${SERVER_PORT:-2039}..."
npx next start -p ${SERVER_PORT:-2039} -H 0.0.0.0 &
NEXT_PID=$!

# Wait for server to be ready
echo "Waiting for server to start..."
for i in $(seq 1 30); do
  if curl -s http://localhost:${SERVER_PORT:-2039} > /dev/null 2>&1; then
    echo "Server is ready!"
    break
  fi
  sleep 1
done

# Download cloudflared if not present
if [ ! -f "./cloudflared" ]; then
  echo "Downloading Cloudflare Tunnel client..."
  curl -L --output ./cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
  chmod +x ./cloudflared
fi

# Start Cloudflare Tunnel
echo "Starting Cloudflare Tunnel..."
./cloudflared tunnel run --token eyJhIjoiZDcwNTRjYzg3MjUxNTU2MzA1MDNlYzdkOTZjNmFjZmIiLCJ0IjoiODlhZDNkY2UtMTVjMS00MDlkLWExNjYtZWM5NmY4MDZjZDE1IiwicyI6Ik5UQmpaVGd5T0dZdE5HTTJaaTAwTUdVMUxUa3dZV1l0WVRWbFlURmhZVGt5TnpJeSJ9 &
CF_PID=$!

echo "=== MKOPA LOAN is running ==="
echo "Next.js PID: $NEXT_PID"
echo "Cloudflare Tunnel PID: $CF_PID"
echo "Local URL: http://localhost:${SERVER_PORT:-2039}"
echo "Tunnel URL: https://mkopa-loan.kenya.qzz.io"
echo "Press Ctrl+C to stop"

# Handle shutdown
trap "echo 'Shutting down...'; kill $NEXT_PID $CF_PID 2>/dev/null; exit 0" SIGINT SIGTERM

# Wait for either process to exit
wait -n $NEXT_PID $CF_PID 2>/dev/null || true
echo "A process has exited. Shutting down..."
kill $NEXT_PID $CF_PID 2>/dev/null || true
