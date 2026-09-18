import { MetadataRoute } from "next";
import { getAllSlugs } from "@/content/concepts";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://engineering-lab.dev";
  const slugs = getAllSlugs();

  const conceptUrls = slugs.map((slug) => ({
    url: `${baseUrl}/learn/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/learn`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...conceptUrls,
  ];
}
