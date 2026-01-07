import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false,
  webpack(config, { isServer }) {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "@injectivelabs/networks": false,
        "@injectivelabs/sdk-ts": false,
        "@injectivelabs/utils": false,
      };
    }

    return config;
  },
};

export default nextConfig;
