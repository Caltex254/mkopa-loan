import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Ensure Prisma generated client files (engine binary, etc.) are traced.
  // NOTE: We intentionally do NOT include `./node_modules/@prisma/client/**/*`
  // or `./node_modules/.prisma/**/*` — those add ~73 MB of unused @prisma/client
  // code (we use the custom output at src/generated/prisma instead).
  outputFileTracingIncludes: {
    "/": ["./src/generated/prisma/**/*"],
  },
  // sharp uses native binaries that must be loaded via Node's require()
  // (not bundled by webpack/turbopack). Without this, Vercel's bundler
  // tries to trace and bundle sharp, which breaks at runtime.
  serverExternalPackages: ["sharp"],
};

export default nextConfig;
