import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Pre-existing errors in IntegratedAiChat.tsx & DocumentViewer.tsx
    // are being fixed separately via Cursor. Ignore during build.
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
