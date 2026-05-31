import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CV Agent",
    short_name: "CV Agent",
    description: "סוכן AI לחיפוש עבודה",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#09090b",
    orientation: "portrait",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon.svg", sizes: "192x192", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
