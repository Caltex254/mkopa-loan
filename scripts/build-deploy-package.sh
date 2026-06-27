#!/bin/bash
set -e

PROJECT_ROOT="/home/z/my-project"
DEPLOY_DIR="${PROJECT_ROOT}/deploy-pkg-clean"
STANDALONE="${PROJECT_ROOT}/.next/standalone"
STATIC="${PROJECT_ROOT}/.next/static"
PUBLIC="${PROJECT_ROOT}/public"

echo "=== Building clean deployment package ==="
rm -rf "${DEPLOY_DIR}"
mkdir -p "${DEPLOY_DIR}/.next"
mkdir -p "${DEPLOY_DIR}/public"

# 1. Copy standalone files
cp "${STANDALONE}/server.js" "${DEPLOY_DIR}/app-server.js"
cp "${STANDALONE}/package.json" "${DEPLOY_DIR}/app-package.json"

# 2. Copy deploy-server.js as server.js (wrapper)
cp "${PROJECT_ROOT}/deploy-server.js" "${DEPLOY_DIR}/server.js"

# 3. Copy node_modules selectively
echo "Copying node_modules (stripped)..."
mkdir -p "${DEPLOY_DIR}/node_modules"
cp -r "${STANDALONE}/node_modules/next" "${DEPLOY_DIR}/node_modules/"
cp -r "${STANDALONE}/node_modules/react" "${DEPLOY_DIR}/node_modules/"
cp -r "${STANDALONE}/node_modules/react-dom" "${DEPLOY_DIR}/node_modules/"
cp -r "${STANDALONE}/node_modules/@next" "${DEPLOY_DIR}/node_modules/"
cp -r "${STANDALONE}/node_modules/@swc" "${DEPLOY_DIR}/node_modules/"
cp -r "${STANDALONE}/node_modules/semver" "${DEPLOY_DIR}/node_modules/"
cp -r "${STANDALONE}/node_modules/styled-jsx" "${DEPLOY_DIR}/node_modules/"
cp -r "${STANDALONE}/node_modules/client-only" "${DEPLOY_DIR}/node_modules/"
cp -r "${STANDALONE}/node_modules/detect-libc" "${DEPLOY_DIR}/node_modules/"

# Sharp - include BOTH glibc (linux-x64) and musl (linuxmusl-x64) variants.
# The Pterodactyl container may be based on Alpine (musl) or Debian/Ubuntu
# (glibc). Sharp's runtime loader picks the matching variant automatically —
# but only if both are present. Previously we stripped the musl variant which
# caused sharp to fail with "Module did not self-register" on Alpine hosts.
mkdir -p "${DEPLOY_DIR}/node_modules/@img"
cp -r "${STANDALONE}/node_modules/@img/sharp-libvips-linux-x64" "${DEPLOY_DIR}/node_modules/@img/" 2>/dev/null || true
cp -r "${STANDALONE}/node_modules/@img/sharp-linux-x64" "${DEPLOY_DIR}/node_modules/@img/" 2>/dev/null || true
cp -r "${STANDALONE}/node_modules/@img/sharp-libvips-linuxmusl-x64" "${DEPLOY_DIR}/node_modules/@img/" 2>/dev/null || true
cp -r "${STANDALONE}/node_modules/@img/sharp-linuxmusl-x64" "${DEPLOY_DIR}/node_modules/@img/" 2>/dev/null || true
cp -r "${STANDALONE}/node_modules/@img/colour" "${DEPLOY_DIR}/node_modules/@img/" 2>/dev/null || true
cp -r "${STANDALONE}/node_modules/sharp" "${DEPLOY_DIR}/node_modules/"

# Prisma - we use the generated client at src/generated/prisma
if [ -d "${STANDALONE}/node_modules/@prisma" ]; then
  cp -r "${STANDALONE}/node_modules/@prisma" "${DEPLOY_DIR}/node_modules/"
fi
if [ -d "${STANDALONE}/node_modules/.prisma" ]; then
  mkdir -p "${DEPLOY_DIR}/node_modules/.prisma"
  cp -r "${STANDALONE}/node_modules/.prisma/client" "${DEPLOY_DIR}/node_modules/.prisma/"
fi

# Also copy @prisma/client from project node_modules as fallback
if [ ! -d "${DEPLOY_DIR}/node_modules/@prisma" ] && [ -d "${PROJECT_ROOT}/node_modules/@prisma" ]; then
  echo "Copying @prisma/client from project node_modules..."
  cp -r "${PROJECT_ROOT}/node_modules/@prisma" "${DEPLOY_DIR}/node_modules/"
  # Strip unused Prisma packages
  rm -rf "${DEPLOY_DIR}/node_modules/@prisma/engines" 2>/dev/null || true
  rm -rf "${DEPLOY_DIR}/node_modules/@prisma/engines-version" 2>/dev/null || true
  rm -rf "${DEPLOY_DIR}/node_modules/@prisma/fetch-engine" 2>/dev/null || true
  rm -rf "${DEPLOY_DIR}/node_modules/@prisma/get-platform" 2>/dev/null || true
  rm -rf "${DEPLOY_DIR}/node_modules/@prisma/config" 2>/dev/null || true
  rm -rf "${DEPLOY_DIR}/node_modules/@prisma/debug" 2>/dev/null || true
  rm -rf "${DEPLOY_DIR}/node_modules/@prisma/adapter-pg" 2>/dev/null || true
  rm -rf "${DEPLOY_DIR}/node_modules/@prisma/driver-adapter-utils" 2>/dev/null || true
  if [ -d "${DEPLOY_DIR}/node_modules/@prisma/client/runtime" ]; then
    find "${DEPLOY_DIR}/node_modules/@prisma/client/runtime" -type f ! -name "library*" -delete 2>/dev/null || true
  fi
  rm -rf "${DEPLOY_DIR}/node_modules/@prisma/client/generator-build" 2>/dev/null || true
fi

# 4. Copy the entire .next/standalone/.next/ directory (production build)
echo "Copying .next/standalone/.next/ (production build)..."
rm -rf "${DEPLOY_DIR}/.next"
cp -r "${STANDALONE}/.next" "${DEPLOY_DIR}/.next"

# 4a. CRITICAL FIX: Next.js standalone does NOT include .next/static — copy it
# from the project .next/static. Without these chunk files, the browser gets 404
# for /_next/static/chunks/*.js and the page crashes with "client-side exception".
echo "Copying .next/static/ (client chunks, CSS, fonts, media)..."
if [ -d "${STATIC}" ]; then
  mkdir -p "${DEPLOY_DIR}/.next/static"
  cp -r "${STATIC}/." "${DEPLOY_DIR}/.next/static/"
  echo "  copied $(find ${DEPLOY_DIR}/.next/static -type f | wc -l) static files"
else
  echo "  WARNING: ${STATIC} not found — client chunks will be missing!"
fi

# 4b. Also copy .next/types and .next/prerender-manifest if present (helps runtime)
if [ -d "${PROJECT_ROOT}/.next/types" ]; then
  cp -r "${PROJECT_ROOT}/.next/types" "${DEPLOY_DIR}/.next/types" 2>/dev/null || true
fi

# 4c. Verify the main entry chunk made it into the package
echo "Verifying client chunks present..."
if ! ls "${DEPLOY_DIR}/.next/static/chunks/"*.js >/dev/null 2>&1; then
  echo "  FATAL: no JS chunks in .next/static/chunks/ — aborting"
  exit 1
fi
echo "  OK: $(ls ${DEPLOY_DIR}/.next/static/chunks/*.js 2>/dev/null | wc -l) JS chunks present"

# 5. Copy public assets
echo "Copying public/..."
if [ -d "${STANDALONE}/public" ] && [ -n "$(ls -A ${STANDALONE}/public 2>/dev/null)" ]; then
  cp -r "${STANDALONE}/public/"* "${DEPLOY_DIR}/public/" 2>/dev/null || true
fi
cp -r "${PUBLIC}/"* "${DEPLOY_DIR}/public/" 2>/dev/null || true

# 6. Copy prisma schema
if [ -d "${PROJECT_ROOT}/prisma" ]; then
  cp -r "${PROJECT_ROOT}/prisma" "${DEPLOY_DIR}/prisma"
fi

# 7. DO NOT strip musl sharp variants — production server may be Alpine (musl).
# Sharp's runtime picks the matching variant automatically when both are present.
# (Previously stripped musl, which broke sharp on Alpine-based Pterodactyl eggs.)

# 8. Remove TypeScript (not needed at runtime)
rm -rf "${DEPLOY_DIR}/node_modules/typescript" 2>/dev/null || true

# 9. Copy generated Prisma client (custom output for standalone compat)
if [ -d "${STANDALONE}/src/generated/prisma" ]; then
  echo "Copying src/generated/prisma..."
  mkdir -p "${DEPLOY_DIR}/src/generated"
  cp -r "${STANDALONE}/src/generated/prisma" "${DEPLOY_DIR}/src/generated/"
fi

# 9a. Copy the admin password reset script (runs on every boot, idempotent)
echo "Copying scripts/reset-admin-password.js..."
mkdir -p "${DEPLOY_DIR}/scripts"
cp "${PROJECT_ROOT}/scripts/reset-admin-password.js" "${DEPLOY_DIR}/scripts/reset-admin-password.js"

# 9b. Ensure bcryptjs is in node_modules (the reset script needs it)
if [ ! -d "${DEPLOY_DIR}/node_modules/bcryptjs" ] && [ -d "${STANDALONE}/node_modules/bcryptjs" ]; then
  echo "Copying bcryptjs from standalone..."
  cp -r "${STANDALONE}/node_modules/bcryptjs" "${DEPLOY_DIR}/node_modules/"
elif [ ! -d "${DEPLOY_DIR}/node_modules/bcryptjs" ] && [ -d "${PROJECT_ROOT}/node_modules/bcryptjs" ]; then
  echo "Copying bcryptjs from project..."
  cp -r "${PROJECT_ROOT}/node_modules/bcryptjs" "${DEPLOY_DIR}/node_modules/"
fi

echo ""
echo "=== Final package size ==="
du -sh "${DEPLOY_DIR}"

echo ""
echo "=== Creating tarball ==="
cd "${PROJECT_ROOT}"
tar -czf mkopa-final-deploy.tar.gz -C "${DEPLOY_DIR}" .
ls -lh "${PROJECT_ROOT}/mkopa-final-deploy.tar.gz"
echo ""
echo "=== Done ==="
