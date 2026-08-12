import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Keep production builds within the memory available on the Coolify host.
  // Static page generation otherwise fans out across all detected CPUs and can
  // be terminated by the kernel without a useful Next.js error.
  experimental: {
    cpus: 1,
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  telemetry: false,
  sourcemaps: {
    disable: true,
  },
});
