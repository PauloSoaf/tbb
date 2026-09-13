import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Client-side Router Cache.
    // Default is 0 for dynamic routes — without this every navigation re-fetches.
    // 5 minutes is safe because mutations call revalidatePath/revalidateTag.
    staleTimes: {
      dynamic: 300,
      static: 1800,
    },
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/uploads/:path*",
          destination: "/api/local-uploads/:path*",
        },
      ],
      afterFiles: [
        {
          source: "/portal/:tenant/paciente/:patient",
          destination: "/portal/:tenant",
        },
        {
          source: "/portal/:tenant/paciente/:patient/:path*",
          destination: "/portal/:tenant/:path*",
        },
      ],
      fallback: [],
    };
  },
};

export default nextConfig;
