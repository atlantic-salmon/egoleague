import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Dev-only: lets the client bundle hydrate when opened via 127.0.0.1 or a LAN IP (second laptop on the same network).
  allowedDevOrigins: [
    "127.0.0.1",
    "192.168.*.*",
    "10.*.*.*",
    "172.*.*.*",
    "*.local",
    ...(process.env.DEV_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean) ?? []),
  ],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
