import type { MetadataRoute } from "next";
import { materialRoutes, serviceRoutes, siteRoutes } from "../site-routes";
import { siteUrl } from "./seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPaths = [
    siteRoutes.home,
    siteRoutes.services,
    siteRoutes.materials,
    siteRoutes.cases,
    siteRoutes.process,
    siteRoutes.models,
    siteRoutes.contact,
  ];
  const servicePaths = Object.values(serviceRoutes);
  const materialPaths = Object.values(materialRoutes);

  return [...staticPaths, ...servicePaths, ...materialPaths].map((path) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: path === siteRoutes.home ? "weekly" : "monthly",
    priority: path === siteRoutes.home ? 1 : 0.8,
  }));
}
