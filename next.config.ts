import type { NextConfig } from 'next';

/**
 * PAGES_EXPORT=1 gera um site estático só com a demo, para o GitHub Pages
 * (ver scripts/build-pages.mjs e .github/workflows/pages.yml).
 */
const pages = process.env.PAGES_EXPORT === '1';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  ...(pages ? { output: 'export', basePath, trailingSlash: true, images: { unoptimized: true } } : {}),
};

export default nextConfig;
