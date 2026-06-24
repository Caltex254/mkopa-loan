#!/bin/bash
# MKOPA LOAN - Docker Entrypoint Script
set -e

echo "=== MKOPA LOAN - Starting ==="

# Push database schema
echo "Pushing database schema..."
bun run db:push 2>/dev/null || npx prisma db push 2>/dev/null || true

# Seed database if empty
echo "Seeding database..."
bun run db:seed 2>/dev/null || npx prisma db seed 2>/dev/null || true

# Start the application
echo "Starting MKOPA LOAN application..."
exec "$@"
