import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Deixa o celular (mesma rede Wi-Fi) abrir o servidor de desenvolvimento do PC.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "*.trycloudflare.com"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
