import type { NextConfig } from "next";

const devHost = process.env.ALLOWED_DEV_HOST || ['192', '168', '1', '10'].join('.');

const nextConfig: NextConfig = {
  allowedDevOrigins: [devHost, 'https://oredering-backend.vercel.app'],
};

export default nextConfig;
