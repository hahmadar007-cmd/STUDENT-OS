import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // @ts-ignore
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
