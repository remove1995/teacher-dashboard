import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "TutorFlow",
    short_name: "TutorFlow",
    description: "Планирование уроков, посещаемость и финансы преподавателя.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F8F4EF",
    theme_color: "#F8F4EF",
    icons: [
      { src: "/assets/tutorflow-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/assets/tutorflow-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/assets/tutorflow-icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
