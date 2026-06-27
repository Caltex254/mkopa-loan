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
};

export default nextConfig;
