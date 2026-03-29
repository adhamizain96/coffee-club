import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "sprudge.com" },
      { protocol: "https", hostname: "images.squarespace-cdn.com" },
      { protocol: "https", hostname: "www.darkmattercoffee.com" },
      { protocol: "https", hostname: "www.brian-coffee-spot.com" },
      { protocol: "https", hostname: "colectivo.com" },
      { protocol: "https", hostname: "bridgeportcoffee.net" },
      { protocol: "https", hostname: "groundswellcoffeeroasters.com" },
      { protocol: "https", hostname: "www.dollopcoffee.com" },
    ],
  },
};

export default nextConfig;
