/** @type {import('next').NextConfig} */
const nextConfig = {
  // Put the production build output into a `build` folder instead of `.next`
  // so you can easily upload/host it on a server.
  distDir: "build",

  images: {
    domains: ["images.unsplash.com", "via.placeholder.com"],
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

module.exports = nextConfig;

