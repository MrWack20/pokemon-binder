import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin Turbopack's workspace root to this project. There's another
  // package-lock.json at D:\Pokemon-Binder which Turbopack would otherwise
  // misidentify as the root and emit a warning every build.
  turbopack: { root: projectRoot },
  // Allow Pokemon TCG / Scryfall / YGOPRODeck card images and Supabase
  // public-bucket cover images to be rendered through next/image without
  // configuring each domain ad-hoc.
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.pokemontcg.io' },
      { protocol: 'https', hostname: 'cards.scryfall.io' },
      { protocol: 'https', hostname: 'images.ygoprodeck.com' },
      { protocol: 'https', hostname: 'optcgapi.com' },
      { protocol: 'https', hostname: 'www.optcgapi.com' },
      { protocol: 'https', hostname: 'ssdmmlxnzlgjriqddpin.supabase.co' },
    ],
    // We mostly load TCG card art via raw <img> for now — disable
    // optimization until we migrate components to next/image.
    unoptimized: true,
  },
};

export default nextConfig;
