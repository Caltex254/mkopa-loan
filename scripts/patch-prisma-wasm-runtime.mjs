#!/usr/bin/env node
/**
 * Post-prisma-generate patch.
 *
 * Switches the generated PrismaClient from the library runtime (which uses
 * native binaries + fs.readdir) to the WASM runtime (which is pure JS and
 * works in Cloudflare Workers).
 *
 * The generated client has TWO entry points:
 *   - index.js  → uses runtime/library.js (native engine, needs fs.readdir)
 *   - wasm.js   → uses runtime/wasm-engine-edge.js (pure JS, no fs)
 *
 * When a driver adapter is passed to PrismaClient, the WASM runtime is
 * used for query construction but actual DB I/O goes through the adapter.
 * The native library engine is never loaded.
 *
 * We patch index.js to import from wasm.js instead of runtime/library.js,
 * so that all existing imports of `@/lib/db` (which imports `index.js`)
 * automatically get the WASM runtime.
 *
 * Run AFTER `prisma generate` and BEFORE `next build`.
 */

import fs from 'node:fs';
import path from 'node:path';

const PRISMA_DIR = path.join(process.cwd(), 'src', 'generated', 'prisma');
const PRISMA_INDEX = path.join(PRISMA_DIR, 'index.js');
const PRISMA_WASM = path.join(PRISMA_DIR, 'wasm.js');

if (!fs.existsSync(PRISMA_INDEX)) {
  console.error(`❌ Prisma client not found: ${PRISMA_INDEX}`);
  console.error('   Did you run `prisma generate` first?');
  process.exit(1);
}

if (!fs.existsSync(PRISMA_WASM)) {
  console.error(`❌ WASM entry not found: ${PRISMA_WASM}`);
  console.error('   Make sure `previewFeatures = ["driverAdapters"]` is set in schema.prisma');
  process.exit(1);
}

// Read wasm.js — it has the same exports as index.js but uses the WASM runtime.
// We rewrite index.js to re-export everything from wasm.js.
const newContent = `/* !!! PATCHED to use WASM runtime for Cloudflare Workers compatibility !!! */
/* Original library.js runtime replaced with wasm-engine-edge.js runtime.   */
/* This file is regenerated on each \`prisma generate\` — re-run the patcher. */

const mod = require('./wasm.js');
// Override engineType so PrismaClient doesn't try to load the native library engine.
// When a driver adapter is passed, the WASM runtime is used for query construction
// and the adapter handles actual DB I/O — the native engine is never needed.
if (mod.config && mod.config.runtimeDataModel) {
  // no-op — config is read-only in v6
}
module.exports = mod;
`;

fs.writeFileSync(PRISMA_INDEX, newContent, 'utf8');

// Also patch wasm.js to set engineType to "wasm" instead of "library"
const wasmPath = path.join(PRISMA_DIR, 'wasm.js');
if (fs.existsSync(wasmPath)) {
  let wasmContent = fs.readFileSync(wasmPath, 'utf8');
  const originalWasm = wasmContent;
  // Replace "engineType": "library" with "engineType": "wasm" (or whatever triggers WASM path)
  wasmContent = wasmContent.replace(
    /"engineType":\s*"library"/g,
    '"engineType": "wasm"',
  );
  if (wasmContent !== originalWasm) {
    fs.writeFileSync(wasmPath, wasmContent, 'utf8');
    console.log('✅ Patched src/generated/prisma/wasm.js:');
    console.log('   engineType: "library" → "wasm"');
  }
}

console.log('✅ Patched src/generated/prisma/index.js:');
console.log('   Now re-exports from ./wasm.js (WASM runtime, no fs.readdir)');
