/** @type {import('next').NextConfig} */
const isNetlify = process.env.NETLIFY === "true";
const isStaticExport = process.env.NEXT_STATIC_EXPORT === "true";
const isStandalone = process.env.NEXT_STANDALONE === "true";

/**
 * IMPORTANT:
 * - Netlify's Next.js runtime expects the default `.next` output directory.
 * - Our project sometimes uses `distDir: "build"` for other hosting targets.
 * - We keep Netlify on defaults to avoid `@netlify/plugin-nextjs` failures.
 */
const nextConfig = {
  ...(isNetlify ? {} : { distDir: "build" }),

  ...(isNetlify
    ? {}
    : isStaticExport
      ? { output: "export" }
      : isStandalone
        ? { output: "standalone" }
        : {}),

  images: {
    domains: ["images.unsplash.com", "via.placeholder.com"],
    formats: ["image/avif", "image/webp"],
    // Required for static export (Next/Image optimization needs a server)
    unoptimized: isStaticExport,
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

module.exports = nextConfig;

