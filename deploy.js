#!/usr/bin/env node
/**
 * MKOPA LOAN - Pterodactyl Deployment Script
 * 
 * This script deploys the MKOPA LOAN application to a Pterodactyl panel
 * using the Pterodactyl Application API.
 * 
 * Usage:
 *   PTERODACTYL_URL=https://your-panel.com node deploy.js
 * 
 * Required environment variables:
 *   PTERODACTYL_URL - Your Pterodactyl panel URL
 */

const PTERODACTYL_API_KEY = 'ptlc_5NWvIlKKA6iafHPbzDYsUkDNCPtC8QhTvUjGxS9YMeK';
const PTERODACTYL_URL = process.env.PTERODACTYL_URL || '';

if (!PTERODACTYL_URL) {
  console.error('Error: PTERODACTYL_URL environment variable is required');
  console.error('Usage: PTERODACTYL_URL=https://your-panel.com node deploy.js');
  process.exit(1);
}

async function pteroApi(method, endpoint, data = null) {
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${PTERODACTYL_API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(`${PTERODACTYL_URL}/api/application/${endpoint}`, options);
  const result = await response.json();

  if (!response.ok) {
    console.error(`API Error (${response.status}):`, result);
    throw new Error(`Pterodactyl API error: ${response.status}`);
  }

  return result;
}

async function deploy() {
  console.log('=== MKOPA LOAN - Pterodactyl Deployment ===\n');

  try {
    // Step 1: List available locations
    console.log('1. Fetching available locations...');
    const locations = await pteroApi('GET', 'locations');
    if (locations.data.length === 0) {
      console.error('No locations found. Please create a location first.');
      process.exit(1);
    }
    const locationId = locations.data[0].attributes.id;
    console.log(`   Using location: ${locations.data[0].attributes.short} (ID: ${locationId})`);

    // Step 2: List available nodes
    console.log('2. Fetching available nodes...');
    const nodes = await pteroApi('GET', 'nodes');
    if (nodes.data.length === 0) {
      console.error('No nodes found. Please create a node first.');
      process.exit(1);
    }
    const nodeId = nodes.data[0].attributes.id;
    console.log(`   Using node: ${nodes.data[0].attributes.name} (ID: ${nodeId})`);

    // Step 3: Get available allocations
    console.log('3. Fetching available allocations...');
    const allocations = await pteroApi('GET', `nodes/${nodeId}/allocations`);
    const freeAllocation = allocations.data.find(a => !a.attributes.assigned);
    if (!freeAllocation) {
      console.error('No free allocations found. Please create an allocation first.');
      process.exit(1);
    }
    const allocationId = freeAllocation.attributes.id;
    console.log(`   Using allocation: ${freeAllocation.attributes.ip}:${freeAllocation.attributes.port} (ID: ${allocationId})`);

    // Step 4: List users (find first user)
    console.log('4. Fetching users...');
    const users = await pteroApi('GET', 'users');
    const userId = users.data[0]?.attributes.id;
    if (!userId) {
      console.error('No users found. Please create a user first.');
      process.exit(1);
    }
    console.log(`   Using user: ${users.data[0].attributes.email} (ID: ${userId})`);

    // Step 5: List nests and eggs
    console.log('5. Fetching available nests/eggs...');
    const nests = await pteroApi('GET', 'nests');
    let eggId = null;
    let nestId = null;
    
    // Look for a Node.js or generic egg
    for (const nest of nests.data) {
      const eggs = await pteroApi('GET', `nests/${nest.attributes.id}/eggs`);
      const nodeEgg = eggs.data.find(e => 
        e.attributes.name.toLowerCase().includes('node') || 
        e.attributes.name.toLowerCase().includes('bun') ||
        e.attributes.name.toLowerCase().includes('generic')
      );
      if (nodeEgg) {
        eggId = nodeEgg.attributes.id;
        nestId = nest.attributes.id;
        console.log(`   Using egg: ${nodeEgg.attributes.name} (ID: ${eggId})`);
        break;
      }
    }

    if (!eggId) {
      // Use first available egg
      const firstNest = nests.data[0];
      const eggs = await pteroApi('GET', `nests/${firstNest.attributes.id}/eggs`);
      if (eggs.data.length > 0) {
        eggId = eggs.data[0].attributes.id;
        nestId = firstNest.attributes.id;
        console.log(`   Using egg: ${eggs.data[0].attributes.name} (ID: ${eggId})`);
      }
    }

    // Step 6: Create the server
    console.log('6. Creating MKOPA LOAN server...');
    const serverData = {
      name: 'MKOPA LOAN',
      user: userId,
      nest: nestId || 1,
      egg: eggId || 1,
      docker_image: 'ghcr.io/parkervcp/yolks:bun_latest',
      startup: 'bun run start',
      environment: {
        SERVER_PORT: '3000',
        DATABASE_URL: 'file:./db/custom.db',
        JWT_SECRET: 'mkopa-loan-secret-key-2024-super-secure',
        PAYMENT_API_KEY: 'pg_Q4LRdgtUxO3HWEYFuOUxvLf2cNDZYHtz',
        PAYMENT_BASE_URL: 'https://pay.xdigitex.space/api',
        NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      },
      limits: {
        memory: 2048,
        swap: 0,
        disk: 5000,
        io: 500,
        cpu: 200,
      },
      feature_limits: {
        databases: 1,
        backups: 2,
        allocations: 1,
      },
      allocation: {
        default: allocationId,
      },
      start_on_completion: true,
    };

    const server = await pteroApi('POST', 'servers', serverData);
    const serverId = server.attributes.id;
    const serverUuid = server.attributes.uuid;
    const serverIdentifier = server.attributes.identifier;

    console.log(`\n✅ Server created successfully!`);
    console.log(`   Server ID: ${serverId}`);
    console.log(`   UUID: ${serverUuid}`);
    console.log(`   Identifier: ${serverIdentifier}`);
    console.log(`\n   Access: ${PTERODACTYL_URL}/server/${serverIdentifier}`);

    // Step 7: Instructions for file upload
    console.log('\n7. Next steps:');
    console.log('   a. Upload the project ZIP file via the Pterodactyl file manager');
    console.log('   b. Or use the following command to upload via API:');
    console.log(`      curl -X POST "${PTERODACTYL_URL}/api/client/servers/${serverIdentifier}/files/upload" \\`);
    console.log(`        -H "Authorization: Bearer ${PTERODACTYL_API_KEY}" \\`);
    console.log(`        -H "Accept: application/json" \\`);
    console.log(`        -F "files=@mkopa-loan.zip"`);
    console.log('   c. Extract the ZIP and run: bun install && bun run db:generate && bun run db:push && bun run build && bun run start');

    // Step 8: Cloudflare tunnel setup
    console.log('\n8. Cloudflare Tunnel Setup:');
    console.log('   Run the following command on the server to start the Cloudflare tunnel:');
    console.log('   cloudflared tunnel run --token eyJhIjoiZDcwNTRjYzg3MjUxNTU2MzA1MDNlYzdkOTZjNmFjZmIiLCJ0IjoiODlhZDNkY2UtMTVjMS00MDlkLWExNjYtZWM5NmY4MDZjZDE1IiwicyI6Ik5UQmpaVGd5T0dZdE5HTTJaaTAwTUdVMUxUa3dZV1l0WVRWbFlURmhZVGt5TnpJeSJ9');

    console.log('\n=== Deployment Complete ===');

  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

deploy();
