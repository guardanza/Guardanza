import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Avatars live in Supabase Storage (prod: *.supabase.co, local dev:
    // 127.0.0.1:54321) — Google-account users default to their Google
    // photo URL directly (lh3.googleusercontent.com) instead of us
    // re-hosting it, since Google already serves it well-sized and cached.
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "http", hostname: "127.0.0.1", port: "54321" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
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
