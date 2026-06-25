import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Ensure Prisma generated client files (engine binary, etc.) are traced
  outputFileTracingIncludes: {
    "/": ["./src/generated/prisma/**/*", "./node_modules/.prisma/**/*", "./node_modules/@prisma/client/**/*"],
  },
};

export default nextConfig;
