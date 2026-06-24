#!/bin/bash
# MKOPA LOAN - Pterodactyl Egg Configuration
# This file defines the Pterodactyl egg for deploying the application

# The egg configuration is in JSON format and should be imported into Pterodactyl
# Below is the egg definition that can be imported via the Pterodactyl admin panel

cat << 'EGG_JSON' > /tmp/mkopa-loan-egg.json
{
  "meta": {
    "version": "PTDL_v2",
    "update_url": null
  },
  "exported_at": "2026-06-11T00:00:00+00:00",
  "name": "MKOPA LOAN",
  "author": "admin@mkopaloan.com",
  "description": "MKOPA LOAN - Digital Lending Platform built with Next.js, Tailwind CSS, and Prisma",
  "features": null,
  "docker_images": {
    "Bun Latest": "ghcr.io/parkervcp/yolks:bun_latest"
  },
  "file_denylist": [],
  "startup": "bun run start",
  "config": {
    "files": "{}",
    "startup": "{\r\n    \"done\": \"Ready in\"\r\n}",
    "logs": "{}",
    "stop": "^C"
  },
  "scripts": {
    "installation": {
      "script": "#!/bin/bash\n\n# MKOPA LOAN Installation Script\necho 'Installing MKOPA LOAN...'\n\n# Install bun if not present\nif ! command -v bun &> /dev/null; then\n    curl -fsSL https://bun.sh/install | bash\n    export PATH=\"$HOME/.bun/bin:$PATH\"\nfi\n\n# Install dependencies\necho 'Installing dependencies...'\nbun install\n\n# Generate Prisma client\necho 'Generating Prisma client...'\nbun run db:generate\n\n# Push database schema\necho 'Pushing database schema...'\nbun run db:push\n\n# Seed the database with admin user\necho 'Seeding database...'\nbun run db:seed 2>/dev/null || true\n\n# Build the application\necho 'Building application...'\nbun run build\n\necho 'Installation complete!'",
      "container": "ghcr.io/parkervcp/installers:debian",
      "entrypoint": "/bin/bash"
    }
  },
  "variables": [
    {
      "name": "Server Port",
      "description": "The port the Next.js server will listen on",
      "env_variable": "SERVER_PORT",
      "default_value": "3000",
      "user_viewable": true,
      "user_editable": false,
      "rules": "required|integer|between:1024,65535",
      "field_type": "text"
    },
    {
      "name": "Database URL",
      "description": "SQLite database connection string",
      "env_variable": "DATABASE_URL",
      "default_value": "file:./db/custom.db",
      "user_viewable": true,
      "user_editable": false,
      "rules": "required|string",
      "field_type": "text"
    },
    {
      "name": "JWT Secret",
      "description": "Secret key for JWT token signing",
      "env_variable": "JWT_SECRET",
      "default_value": "mkopa-loan-secret-key-2024-super-secure",
      "user_viewable": true,
      "user_editable": true,
      "rules": "required|string|min:20",
      "field_type": "text"
    },
    {
      "name": "Payment API Key",
      "description": "Xdigitex Pay API key for STK Push payments",
      "env_variable": "PAYMENT_API_KEY",
      "default_value": "pg_Q4LRdgtUxO3HWEYFuOUxvLf2cNDZYHtz",
      "user_viewable": true,
      "user_editable": true,
      "rules": "required|string",
      "field_type": "text"
    },
    {
      "name": "Payment Base URL",
      "description": "Xdigitex Pay API base URL",
      "env_variable": "PAYMENT_BASE_URL",
      "default_value": "https://pay.xdigitex.space/api",
      "user_viewable": true,
      "user_editable": false,
      "rules": "required|string",
      "field_type": "text"
    },
    {
      "name": "App URL",
      "description": "Public URL of the application for callbacks",
      "env_variable": "NEXT_PUBLIC_APP_URL",
      "default_value": "http://localhost:3000",
      "user_viewable": true,
      "user_editable": true,
      "rules": "required|string",
      "field_type": "text"
    }
  ]
}
EGG_JSON

echo "Egg configuration exported to /tmp/mkopa-loan-egg.json"
echo "Import this egg into your Pterodactyl panel via: Admin > Nests > Import Egg"
