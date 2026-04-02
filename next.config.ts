import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";
import path from "path";

// Ensure .env* are loaded before reading public vars (helps Turbopack dev inlining).
loadEnvConfig(path.resolve(process.cwd()));

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  },
};

export default nextConfig;
