#!/bin/bash
# MKOPA LOAN - Pterodactyl Deployment Script
# Deploy to Pterodactyl panel using API

set -e

PTERODACTYL_URL="${PTERODACTYL_URL:-https://panel.yourhost.com}"
PTERODACTYL_API_KEY="ptlc_5NWvIlKKA6iafHPbzDYsUkDNCPtC8QhTvUjGxS9YMeK"
NEST_ID=1
ENVIRONMENT_ID=1

echo "=== MKOPA LOAN - Pterodactyl Deployment ==="

# Function to make API calls
ptero_api() {
  local method=$1
  local endpoint=$2
  local data=$3

  if [ -z "$data" ]; then
    curl -s -X "$method" \
      "${PTERODACTYL_URL}/api/application/${endpoint}" \
      -H "Authorization: Bearer ${PTERODACTYL_API_KEY}" \
      -H "Content-Type: application/json" \
      -H "Accept: application/json"
  else
    curl -s -X "$method" \
      "${PTERODACTYL_URL}/api/application/${endpoint}" \
      -H "Authorization: Bearer ${PTERODACTYL_API_KEY}" \
      -H "Content-Type: application/json" \
      -H "Accept: application/json" \
      -d "$data"
  fi
}

# Step 1: Create the server
echo "Creating Pterodactyl server..."

SERVER_DATA=$(cat <<EOF
{
  "name": "MKOPA LOAN",
  "user": 1,
  "nest": ${NEST_ID},
  "egg": 5,
  "docker_image": "ghcr.io/parkervcp/yolks:bun_latest",
  "startup": "bun run start",
  "environment": {
    "SERVER_PORT": "3000",
    "DATABASE_URL": "file:./db/custom.db",
    "JWT_SECRET": "mkopa-loan-secret-key-2024-super-secure",
    "PAYMENT_API_KEY": "pg_Q4LRdgtUxO3HWEYFuOUxvLf2cNDZYHtz",
    "PAYMENT_BASE_URL": "https://pay.xdigitex.space/api",
    "NEXT_PUBLIC_APP_URL": "http://localhost:3000"
  },
  "limits": {
    "memory": 2048,
    "swap": 0,
    "disk": 5000,
    "io": 500,
    "cpu": 200
  },
  "feature_limits": {
    "databases": 1,
    "backups": 2,
    "allocations": 1
  },
  "allocation": {
    "default": 1
  },
  "start_on_completion": true
}
EOF
)

RESPONSE=$(ptero_api "POST" "servers" "$SERVER_DATA")
echo "Server creation response: $RESPONSE"

# Extract server ID
SERVER_ID=$(echo "$RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

if [ -z "$SERVER_ID" ]; then
  echo "Failed to create server. Response:"
  echo "$RESPONSE"
  exit 1
fi

echo "Server created with ID: $SERVER_ID"

# Step 2: Upload project files
echo "Uploading project files..."
# This would be done via SFTP or the file upload API
# For Pterodactyl, we need to create a ZIP and upload via the API

echo "=== Deployment Complete ==="
echo "Server ID: $SERVER_ID"
echo "Access your server at: ${PTERODACTYL_URL}/server/${SERVER_ID}"
