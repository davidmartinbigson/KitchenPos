import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/", "/features", "/login", "/signup", "/menu"], disallow: ["/api", "/r", "/dashboard", "/pos", "/sales", "/staff", "/settings", "/kitchen", "/admin", "/live"] }],
    sitemap: "https://prokitchenpos.com/sitemap.xml",
  };
}
