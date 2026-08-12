import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fatty Apuntes",
    short_name: "Fatty Apuntes",
    description: "Apuntes de la facu, organizados por año y materia.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#fdf8f0",
    theme_color: "#e8792c",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
