import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Server Actions default to a 1MB request body — real property/ID
    // photos from a phone routinely exceed that, so every upload was
    // silently failing. Raised to cover a typical phone photo.
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
