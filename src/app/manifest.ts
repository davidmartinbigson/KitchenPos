import type { MetadataRoute } from "next";

/**
 * PWA manifest — makes Kitchen POS installable like a native Windows / Android app.
 * start_url is /dashboard so a signed-in owner lands straight at work in ONE click
 * (session cookie persists 30 days; signed-out users hit /login first, then proceed).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kitchen POS — Restaurant POS Software",
    short_name: "Kitchen POS",
    description:
      "Point of sale for restaurants, cafés and cloud kitchens: menu, QR self-ordering, kitchen display and daily sales reports. Works offline.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#fbf7f2",
    theme_color: "#f97316",
    lang: "en",
    categories: ["business", "food", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Dashboard",
        short_name: "Dashboard",
        url: "/dashboard",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "POS — Sell",
        short_name: "POS",
        url: "/pos",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Kitchen Screen",
        short_name: "Kitchen",
        url: "/kitchen",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
