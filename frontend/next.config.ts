import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const backend = process.env.BACKEND_URL || "http://127.0.0.1:8000";
    return {
      fallback: [
        {
          source: "/:path*",
          destination: `${backend}/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
