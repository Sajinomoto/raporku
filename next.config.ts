import type { NextConfig } from "next";

// 'unsafe-eval' hanya dibutuhkan React dev tools saat development.
const isDev = process.env.NODE_ENV === "development";

// CSP dimulai sebagai Report-Only: pantau violation di console browser,
// lalu ganti kunci menjadi "Content-Security-Policy" untuk menegakkan.
// Catatan: script-src masih memakai 'unsafe-inline' (defense-in-depth).
// Untuk CSP ketat penuh, gunakan nonce via proxy.ts atau SRI eksperimental.
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""};
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https://cfsvszkellsiisqkifci.supabase.co;
  connect-src 'self' https://cfsvszkellsiisqkifci.supabase.co wss://cfsvszkellsiisqkifci.supabase.co;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cfsvszkellsiisqkifci.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // HSTS hanya berlaku lewat HTTPS — aman disertakan (dipicu hanya saat produksi via HTTPS).
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
          {
            key: "Content-Security-Policy-Report-Only",
            value: cspHeader.replace(/\n/g, ""),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
