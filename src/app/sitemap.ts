import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://prokitchenpos.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${base}/features`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/login`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/signup`, changeFrequency: "yearly", priority: 0.6 },
  ];
}
