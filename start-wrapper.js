#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

// Execute the start-with-tunnel.sh script
const child = spawn('bash', [path.join(__dirname, 'start-with-tunnel.sh')], {
  stdio: 'inherit',
  env: { ...process.env },
  cwd: process.env.HOME || '/home/container'
});

child.on('exit', (code) => {
  process.exit(code || 0);
});

process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
