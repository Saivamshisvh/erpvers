import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `
              default-src 'self';
              base-uri 'self';
              object-src 'none';
              frame-ancestors 'none';
              form-action 'self' mailto:;
              img-src 'self' data:;
              script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ""};
              style-src 'self' 'unsafe-inline';
              connect-src 'self';
            `
              .replace(/\s{2,}/g, " ")
              .trim(),
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
        ],
      },
    ];
  },
};

export default nextConfig;