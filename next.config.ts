import type { NextConfig } from "next";
import path from "path";

type RemotePattern = NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]>[number];

function getSupabaseImagePatterns(): RemotePattern[] {
  const patterns: RemotePattern[] = [
    {
      protocol: "https",
      hostname: "**.supabase.co",
      pathname: "/storage/v1/object/**",
    },
  ];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return patterns;

  try {
    const { hostname } = new URL(supabaseUrl);
    patterns.unshift({
      protocol: "https",
      hostname,
      pathname: "/storage/v1/object/**",
    });
  } catch {
    // ignore invalid env URL
  }

  return patterns;
}

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "i.pinimg.com",
      },
      ...getSupabaseImagePatterns(),
    ],
  },
};

export default nextConfig;
