import type { NextConfig } from "next";

const securityHeaders = [
  // Niente embedding in iframe di terzi (anti-clickjacking)
  { key: "X-Frame-Options", value: "DENY" },
  // No MIME sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Referrer minimo cross-origin
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // HTTPS forzato (Vercel serve già https; 2 anni, include subdomains)
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // GPS consentito solo same-origin (serve al gioco); resto negato
  {
    key: "Permissions-Policy",
    value: "geolocation=(self), camera=(self), microphone=(), payment=()",
  },
];

const nextConfig: NextConfig = {
  compiler: {
    // In produzione rimuove console.* di debug, tiene error/warn
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  // CSP rimandata (vedi AUDIT-TODO T12): da introdurre in Report-Only
  // dopo aver mappato le sorgenti (Supabase REST+wss, Stadia tiles,
  // Google OAuth, inline styles del design system player).
};

export default nextConfig;