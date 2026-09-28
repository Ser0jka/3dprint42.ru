import type { NextConfig } from "next";
import { legacyRedirects, seoRewrites } from "./site-routes";

const nextConfig: NextConfig = {
  async redirects() {
    return legacyRedirects.map((redirect) => ({ ...redirect, permanent: true }));
  },
  async rewrites() {
    return [...seoRewrites];
  },
};

export default nextConfig;
