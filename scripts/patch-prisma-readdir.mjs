#!/usr/bin/env node
/**
 * Post-build patch for OpenNext Cloudflare bundle.
 *
 * Patches the Prisma runtime's `tH()` function (which determines the engine
 * type) to always return "client" — the engine type that uses driver adapters
 * and doesn't need native binaries.
 *
 * Also patches:
 *   - fs.readdir → no-op (so binary-target detection doesn't crash)
 *   - The `engineType: "library"` literal in the bundled config → "client"
 *
 * Run AFTER `npx @opennextjs/cloudflare build` and BEFORE `wrangler deploy`.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SERVER_FN_DIR = path.join(ROOT, '.open-next', 'server-functions', 'default');

if (!fs.existsSync(SERVER_FN_DIR)) {
  console.error(`❌ Server functions dir not found: ${SERVER_FN_DIR}`);
  process.exit(1);
}

let filesPatched = 0;
let filesScanned = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full);
    } else if (full.endsWith('.js') || full.endsWith('.mjs')) {
      filesScanned++;
      patchFile(full);
    }
  }
}

function patchFile(file) {
  const original = fs.readFileSync(file, 'utf8');
  if (!original.includes('engineType') && !original.includes('readdir')) return;

  let patched = original;

  // PATTERN 1: Replace `engineType:"library"` with `engineType:"client"`
  // (note: bundlers strip spaces, so check both)
  patched = patched.replace(
    /engineType:\s*"library"/g,
    'engineType:"client"',
  );

  // PATTERN 2: Replace the tH function that reads engineType
  // The bundled function looks like:
  //   function tH(e10){...return ... "library"}
  // We replace any string literal "library" that appears as a fallback return
  // in a function that checks engineType — easiest: replace `"library"` with `"client"`
  // ONLY in the engineType-check context. We use a more targeted regex:
  patched = patched.replace(
    /(\w+\?\.config\.engineType===)"library"\?"library":\1==="binary"\?"binary":\1==="client"\?"client":"library"/g,
    '$1"client"?"client":$1==="binary"?"binary":$1==="library"?"library":"client"',
  );

  // PATTERN 3: fs.readdir → empty array (Prisma binary-target detection)
  patched = patched.replace(
    /\(await\s+\w+\.default\.readdir\([^)]*\)\)/g,
    '([])',
  );
  patched = patched.replace(
    /await\s+\w+\.default\.readdir\([^)]*\)/g,
    '[]',
  );
  patched = patched.replace(
    /(\w+)\.default\.readdir\(([^,)]+),\s*([^)]+)\)/g,
    '$3(null, [])',
  );
  patched = patched.replace(
    /\w+\.default\.readdirSync\([^)]*\)/g,
    '[]',
  );

  // PATTERN 4: Skip instantiateLibrary when adapter is present.
  // The Prisma v6 library engine's start() calls instantiateLibrary() which
  // tries to load the native binary — even when a driver adapter is set.
  // Patch: if `this.config.adapter` exists, skip the library instantiation.
  // We replace `instantiateLibrary()` calls to first check for adapter.
  patched = patched.replace(
    /this\.libraryInstantiationPromise=this\.instantiateLibrary\(\)/g,
    'this.libraryInstantiationPromise=this.config.adapter?Promise.resolve():this.instantiateLibrary()',
  );

  // PATTERN 5: Skip engine.connect() when adapter is present.
  // In start(): `await this.engine?.connect(...)` fails because this.engine
  // is undefined when adapter is used. Patch to skip the connect call when
  // adapter is set — just set up the adapter promise directly.
  patched = patched.replace(
    /await this\.engine\?\.connect\(JSON\.stringify\(e11\)\),this\.libraryStarted=!0,this\.adapterPromise\|\|/g,
    'this.config.adapter||(await this.engine?.connect(JSON.stringify(e11))),this.libraryStarted=!0,this.adapterPromise||',
  );

  // PATTERN 6: Skip engine.query() when adapter is present.
  // Queries call this.engine?.query() which returns undefined when engine
  // isn't loaded. When adapter is set, queries should go through adapter.
  // The adapter query path is handled by _requestHandler, but the engine
  // method still gets called. Patch: when adapter present, return empty response
  // (the adapter handles actual query execution via _requestHandler).
  // Actually, looking more carefully, the issue is that the engine's query()
  // method is called and returns undefined. We need to make it return a valid
  // empty response shape. But this is complex — let's see if Pattern 5 is enough.

  if (patched !== original) {
    fs.writeFileSync(file, patched, 'utf8');
    filesPatched++;
    console.log(`  ✅ Patched: ${path.relative(ROOT, file)}`);
  }
}

console.log(`Scanning ${SERVER_FN_DIR}...`);
walk(SERVER_FN_DIR);
console.log(`\nDone. Scanned ${filesScanned} files, patched ${filesPatched} files.`);
