import type { NextConfig } from 'next';

/**
 * Optional same-origin API proxy. Set API_PROXY_TARGET (e.g. https://my-api.onrender.com) at build time and
 * the browser talks to /api/* on the frontend's own domain, so the session cookie is first-party. This avoids
 * third-party-cookie blocking (Safari, Chrome incognito) when the frontend and backend are on different sites.
 */
const proxyTarget = process.env.API_PROXY_TARGET?.replace(/\/$/, '');

const nextConfig: NextConfig = {
  reactCompiler: true,
  env: { NEXT_PUBLIC_API_PROXY: proxyTarget ? 'true' : '' },
  // Some browsers request /favicon.ico regardless of <link rel="icon">; point them at the logo.
  async redirects() {
    return [{ source: '/favicon.ico', destination: '/route53-logo.webp', permanent: false }];
  },
  async rewrites() {
    return proxyTarget ? [{ source: '/api/:path*', destination: `${proxyTarget}/api/:path*` }] : [];
  },
};

export default nextConfig;
